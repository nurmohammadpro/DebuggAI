/**
 * useGeneration Hook
 *
 * Custom hook for handling AI code generation with SSE streaming.
 * Used by both the web builder and debugger.
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { useGenerationStore } from '@/store/generation-store';
import type { VirtualProjectFiles, VirtualFile } from '@/lib/project/virtual-files';
import { extractVirtualFiles, serializeVirtualFiles } from '@/lib/project/virtual-files';

function languageFromPath(path: string): string | undefined {
  const lower = path.toLowerCase();
  if (lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.ts')) return 'typescript';
  if (lower.endsWith('.jsx')) return 'javascript';
  if (lower.endsWith('.js')) return 'javascript';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.html')) return 'html';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md')) return 'markdown';
  if (lower.endsWith('.py')) return 'python';
  if (lower.endsWith('.rb')) return 'ruby';
  if (lower.endsWith('.go')) return 'go';
  if (lower.endsWith('.php')) return 'php';
  return undefined;
}

function templateToVirtualFiles(flatFiles: Record<string, string>): VirtualProjectFiles {
  const files: Record<string, VirtualFile> = {};
  let entryPath = '';

  for (const [path, content] of Object.entries(flatFiles)) {
    const normalizedPath = path.replace(/\\/g, '/').replace(/^(\.\/)+/, '');
    files[normalizedPath] = {
      path: normalizedPath,
      content,
      language: languageFromPath(normalizedPath),
      status: 'added',
    };
  }

  // Pick the best entry point
  const entryCandidates = [
    'client/src/App.js',
    'client/src/App.tsx',
    'client/src/App.jsx',
    'src/App.tsx',
    'src/App.js',
    'server/index.js',
    'server/server.js',
    'main.go',
    'manage.py',
    'app.py',
    'config/routes.rb',
  ];
  for (const candidate of entryCandidates) {
    if (files[candidate]) {
      entryPath = candidate;
      break;
    }
  }
  if (!entryPath) {
    entryPath = Object.keys(files)[0] || 'package.json';
  }

  return { entryPath, files };
}

function serializeVirtualFilesWrapper(project: VirtualProjectFiles): string {
  return serializeVirtualFiles(project);
}
import { parseSSEResponseWithCallback } from '@/lib/sse-parser';

import { supabase } from '@/lib/supabase';
import { getSession } from '@/hooks/use-session';

interface UseGenerationOptions {
  onChunk?: (chunk: string) => void;
  onDone?: (code: string) => void;
  onError?: (error: Error) => void;
}

interface GenerationRequest {
  prompt: string;
  history?: Array<{ role: string; content: string }>;
  persistUserMessage?: boolean;
}

interface DebugRequest {
  code: string;
  errorMessage: string;
  language?: string;
  prompt?: string;
  history?: Array<{ role: string; content: string }>;
}

export function useGeneration(options: UseGenerationOptions = {}) {
  const { onChunk, onDone, onError } = options;
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { 
    appendAccumulated, 
    resetAccumulated, 
    setCurrentCode, 
    addVersion,
    currentProjectId,
    currentThreadId,
    setProjectId,
    setThreadId,
    clearThread,
  } = useGenerationStore();

  const getAuthHeaders = async () => {
    const { session } = await getSession();
    if (!session?.access_token) return null;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.access_token}`,
    };
    if (typeof document !== 'undefined') {
      const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
      if (m?.[1]) headers['x-csrf-token'] = m[1];
    }
    return headers;
  };

  const ensureThread = useCallback(async (): Promise<string> => {
    if (currentThreadId) return currentThreadId;

    const authHeaders = await getAuthHeaders();
    if (!authHeaders) throw new Error('Unauthorized: please sign in again');

    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        title: null,
        projectId: currentProjectId,
        workspaceId: null,
        metadata: { source: 'use-generation' },
      }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `Failed to create thread (HTTP ${res.status})`);
    }

    const j = await res.json();
    const id = j?.thread?.id;
    if (!id) throw new Error('Thread creation failed');
    setThreadId(id);
    return id;
  }, [currentProjectId, currentThreadId, setThreadId]);

  /**
   * Generate code from AI prompt with SSE streaming
   */
  const generate = useCallback(
    async (request: GenerationRequest) => {
      setIsLoading(true);
      setError(null);
      resetAccumulated();

      try {
        const authHeaders = await getAuthHeaders();
        if (!authHeaders) {
          throw new Error('Unauthorized: please sign in again');
        }

        const threadId = await ensureThread();
        // Idempotency key prevents double-charging credits on retry
        const idempotencyKey = `${threadId}_${Date.now()}`;
        const response = await fetch('/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ persistUserMessage: true, ...request, threadId, idempotencyKey }),
        });

        // Handle rate limiting with Retry-After
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const waitSec = retryAfter ? parseInt(retryAfter, 10) : 60;
          throw new Error(`Rate limited. Please wait ${waitSec} seconds before trying again.`);
        }

        if (!response.ok) {
          const raw = await response.text().catch(() => '');
          const errorData: unknown = raw
            ? (() => {
                try {
                  return JSON.parse(raw) as unknown;
                } catch {
                  return {};
                }
              })()
            : {};

          const getField = (obj: unknown, key: string): string | undefined => {
            if (!obj || typeof obj !== 'object') return;
            const rec = obj as Record<string, unknown>;
            const v = rec[key];
            return typeof v === 'string' ? v : undefined;
          };

          const msg =
            getField(errorData, 'error') ||
            getField(errorData, 'message') ||
            getField(errorData, 'details') ||
            `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(msg);
        }

        // Parse SSE stream with callback
        const accumulated = await parseSSEResponseWithCallback(
          response,
          (chunk) => {
            appendAccumulated(chunk);
            onChunk?.(chunk);
          }
        );

        // Build/refresh virtual file snapshot from the full accumulated response.
        // extractVirtualFiles handles file markers (// File: path/to/file.tsx), code fences, and
        // the split-by-marker format the new generate prompt produces.
        const baseFiles = useGenerationStore.getState().files || undefined;
        const virtualFiles = extractVirtualFiles(accumulated, baseFiles || undefined);

        if (Object.keys(virtualFiles.files).length === 0) {
          throw new Error('No code found in AI response');
        }

        const entryContent = virtualFiles.files[virtualFiles.entryPath]?.content || '';
        const serialized = serializeVirtualFilesWrapper(virtualFiles);

        useGenerationStore.setState({
          files: virtualFiles,
          activeFilePath: virtualFiles.entryPath,
        });

        setCurrentCode(entryContent);
        addVersion(serialized, 'Generated');

        // Persistence to Supabase
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            if (currentProjectId) {
              await supabase
                .from('generations')
                .update({ code: serialized })
                .eq('id', currentProjectId);
            } else {
              // Create new canonical project (+ initial generation) via API.
              const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({
                  code: serialized,
                  prompt: request.prompt,
                  description: request.prompt.slice(0, 50),
                  stack: null,
                  metadata: {},
                }),
              });
              if (res.ok) {
                const j = await res.json().catch(() => ({}));
                if (j?.id) {
                  setProjectId(j.id);
                  // Keep the same thread (preserves chat history), but attach it to the new project.
                  try {
                    await fetch(`/api/threads/${threadId}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', ...authHeaders },
                      body: JSON.stringify({ projectId: j.id }),
                    });
                  } catch {
                    // best-effort
                  }
                }
              }
            }
            // Invalidate the projects query so the sidebar updates
            await queryClient.invalidateQueries({ queryKey: queryKeys.myProjects });
          }
        } catch (saveError) {
          console.error('Failed to persist generation:', saveError);
        }

        // Call onDone callback with serialized multi-file project
        onDone?.(serialized);

        return serialized;
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error('Generation failed');
        setError(errorObj);
        onError?.(errorObj);
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [
      appendAccumulated, 
      resetAccumulated, 
      setCurrentCode, 
      addVersion, 
      onChunk, 
      onDone, 
      onError,
      currentProjectId,
      ensureThread,
      setProjectId,
      queryClient
    ]
  );

  /**
   * Generate project from static template (instant, no LLM).
   * Used for stack-based project creation (MERN, MEAN, etc.).
   */
  const generateFromTemplate = useCallback(
    async (stack: string, features: string[], projectName: string) => {
      setIsLoading(true);
      setError(null);
      resetAccumulated();

      try {
        const authHeaders = await getAuthHeaders();
        if (!authHeaders) {
          throw new Error('Unauthorized: please sign in again');
        }

        const response = await fetch('/api/generate/template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({ stack, features, projectName }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 402) {
            throw new Error(
              errorData.error || 'Insufficient credits. Upgrade your plan to continue.'
            );
          }
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        const data = await response.json();
        const flatFiles: Record<string, string> = data.template || {};

        if (Object.keys(flatFiles).length === 0) {
          throw new Error('Template returned no files');
        }

        // Convert flat Record<string,string> to VirtualProjectFiles
        const virtualFiles = templateToVirtualFiles(flatFiles);

        // Set files and entry path in store
        setCurrentCode(virtualFiles.files[virtualFiles.entryPath]?.content || '');
        useGenerationStore.setState({
          files: virtualFiles,
          activeFilePath: virtualFiles.entryPath,
          accumulated: JSON.stringify(flatFiles, null, 2),
        });

        // Save as new version
        const serialized = serializeVirtualFilesWrapper(virtualFiles);
        addVersion(serialized, `Template: ${stack}`);

        // Persist to Supabase
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const res = await fetch('/api/projects', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              body: JSON.stringify({
                code: serialized,
                prompt: `${stack} stack: ${projectName}`,
                description: `${stack.toUpperCase()} project: ${projectName}`,
                stack,
                metadata: { features, generatedFrom: 'template' },
              }),
            });
            if (res.ok) {
              const j = await res.json().catch(() => ({}));
                if (j?.id) {
                  setProjectId(j.id);
                  // Preserve existing conversation; attach thread to the new project.
                  try {
                    const tid = await ensureThread();
                    await fetch(`/api/threads/${tid}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', ...authHeaders },
                      body: JSON.stringify({ projectId: j.id }),
                    });
                  } catch {
                    // best-effort
                  }
                }
              }
          }
          await queryClient.invalidateQueries({ queryKey: queryKeys.myProjects });
        } catch (saveError) {
          console.error('Failed to persist template project:', saveError);
        }

        onDone?.(serialized);
        return serialized;
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error('Template generation failed');
        setError(errorObj);
        onError?.(errorObj);
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [
      appendAccumulated,
      resetAccumulated,
      setCurrentCode,
      addVersion,
      onDone,
      onError,
      setProjectId,
      queryClient,
    ]
  );

  /**
   * Debug code with error message
   * Convenience method for debugging
   */
  const debug = useCallback(
    async (code: string, errorMessage: string, language?: string) => {
      setIsLoading(true);
      setError(null);
      resetAccumulated();

      try {
        const authHeaders = await getAuthHeaders();
        if (!authHeaders) {
          throw new Error('Unauthorized: please sign in again');
        }
        const threadId = await ensureThread();
        const request: DebugRequest = {
          code,
          errorMessage,
          language,
          prompt: 'Debug this code',
        };

        const response = await fetch('/api/debug', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ ...request, threadId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`
          );
        }

        // Parse SSE stream with callback
        const accumulated = await parseSSEResponseWithCallback(
          response,
          (chunk) => {
            appendAccumulated(chunk);
            onChunk?.(chunk);
          }
        );

        // Build virtual file snapshot from the full accumulated response.
        // This handles the new debug prompt format where fixes include complete
        // project files with file markers (// File: path/to/file.tsx).
        const baseFiles = useGenerationStore.getState().files || undefined;
        const virtualFiles = extractVirtualFiles(accumulated, baseFiles || undefined);

        if (Object.keys(virtualFiles.files).length === 0) {
          throw new Error('No code found in debug response');
        }

        const entryContent = virtualFiles.files[virtualFiles.entryPath]?.content || '';
        const serialized = serializeVirtualFilesWrapper(virtualFiles);

        useGenerationStore.setState({
          files: virtualFiles,
          activeFilePath: virtualFiles.entryPath,
        });

        setCurrentCode(entryContent);
        addVersion(serialized, 'Debugged fix');

        // Call onDone callback with serialized multi-file fix
        onDone?.(serialized);

        return serialized;
      } catch (err) {
        const errorObj =
          err instanceof Error ? err : new Error('Debug failed');
        setError(errorObj);
        onError?.(errorObj);
        throw errorObj;
      } finally {
        setIsLoading(false);
      }
    },
    [appendAccumulated, resetAccumulated, setCurrentCode, addVersion, onChunk, onDone, onError]
  );

  return {
    generate,
    generateFromTemplate,
    debug,
    isLoading,
    error,
    ensureThreadId: ensureThread,
  };
}
