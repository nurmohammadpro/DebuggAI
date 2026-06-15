/**
 * useGeneration Hook
 *
 * Custom hook for handling AI code generation with SSE streaming.
 * Used by both the web builder and debugger.
 */

import { useState, useCallback, useRef } from 'react';
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

function hasSubstantiveFiles(project: VirtualProjectFiles): boolean {
  return Object.values(project.files).some(
    (file) => file.status !== 'deleted' && file.content.trim().length > 0,
  );
}

export function shouldFallbackFromAgentStatus(status: number): boolean {
  return status === 404 || status === 405 || status === 501;
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
  generationDirective?: string;
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
  const abortRef = useRef<AbortController | null>(null);

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

  // Track in-flight thread creation across renders. A plain local variable is
  // recreated every render, which can create duplicate threads if the user
  // quickly sends/refactors while React re-renders the panel.
  const threadPromiseRef = useRef<Promise<string> | null>(null);

  const ensureThread = useCallback(async (): Promise<string> => {
    const latestState = useGenerationStore.getState();
    const existingThreadId = latestState.currentThreadId || currentThreadId;
    if (existingThreadId) return existingThreadId;
    if (threadPromiseRef.current) return threadPromiseRef.current;

    threadPromiseRef.current = (async () => {
      const authHeaders = await getAuthHeaders();
      if (!authHeaders) throw new Error('Unauthorized: please sign in again');
      const projectId = useGenerationStore.getState().currentProjectId || currentProjectId;

      const res = await fetch('/api/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          title: null,
          projectId,
          workspaceId: null,
          metadata: { source: 'use-generation' },
        }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = typeof j?.error === 'string' ? j.error
          : typeof j?.error?.message === 'string' ? j.error.message
          : typeof j?.message === 'string' ? j.message
          : `Failed to create thread (HTTP ${res.status})`;
        throw new Error(msg);
      }

      const j = await res.json();
      const id = j?.thread?.id;
      if (!id) throw new Error('Thread creation failed');
      setThreadId(id);
      return id;
    })();

    try {
      return await threadPromiseRef.current;
    } finally {
      threadPromiseRef.current = null;
    }
  }, [currentProjectId, currentThreadId, setThreadId]);

  /**
   * Persist an assistant message to the thread so follow-up turns
   * (refactor, fix, polish) have DB-backed context of prior generations.
   */
  const persistAssistantMessage = useCallback(
    async (threadId: string, content: string, metadata?: Record<string, unknown>) => {
      try {
        const authHeaders = await getAuthHeaders();
        if (!authHeaders) return;
        const projectId = useGenerationStore.getState().currentProjectId;
        await fetch(`/api/threads/${threadId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            role: 'assistant',
            content,
            projectId,
            metadata: { type: 'generation', ...(metadata || {}) },
          }),
        });
      } catch {
        // Best-effort — generation already succeeded, don't fail over message persistence
      }
    },
    [],
  );

  /**
   * Generate code from AI prompt with SSE streaming
   */
  const generate = useCallback(
    async (request: GenerationRequest) => {
      setIsLoading(true);
      setError(null);
      resetAccumulated();

      // Create a fresh AbortController for this request
      const controller = new AbortController();
      abortRef.current = controller;

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
          signal: controller.signal,
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
        // If no code files are detected, treat as conversational response only (no file update).
        const baseFiles = useGenerationStore.getState().files || undefined;
        const virtualFiles = extractVirtualFiles(accumulated, baseFiles || undefined);

        if (hasSubstantiveFiles(virtualFiles)) {
          const entryContent = virtualFiles.files[virtualFiles.entryPath]?.content || '';
          const serialized = serializeVirtualFilesWrapper(virtualFiles);
          let projectIdForPersistence = useGenerationStore.getState().currentProjectId || currentProjectId;

          useGenerationStore.setState({
            files: virtualFiles,
            activeFilePath: virtualFiles.entryPath,
          });

          useGenerationStore.getState().bumpPreviewNonce();

          setCurrentCode(entryContent);
          addVersion(serialized, 'Generated');

          // Persistence to Supabase
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              if (projectIdForPersistence) {
                const flatFiles = Object.fromEntries(
                  Object.entries(virtualFiles.files)
                    .filter(([, file]) => file.status !== 'deleted')
                    .map(([path, file]) => [path, file.content]),
                );
                await fetch(`/api/projects/${projectIdForPersistence}/save-code`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', ...authHeaders },
                  body: JSON.stringify({
                    code: serialized,
                    files: flatFiles,
                    prompt: request.prompt,
                    description: 'Generated',
                    threadId,
                  }),
                });
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
                    projectIdForPersistence = j.id;
                    setProjectId(j.id);
                    // Keep the same thread (preserves chat history), but attach it to the new project.
                    try {
                      const patchRes = await fetch(`/api/threads/${threadId}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json', ...authHeaders },
                        body: JSON.stringify({ projectId: j.id }),
                      });
                      if (!patchRes.ok) {
                        console.error('[use-generation] Failed to link thread to project', {
                          threadId,
                          projectId: j.id,
                          status: patchRes.status,
                        });
                      }
                    } catch (err) {
                      console.error('[use-generation] Thread link PATCH failed', err);
                    }
                  }
                }
              }
              // Invalidate queries so the sidebar and dashboard update
              await Promise.all([
                queryClient.invalidateQueries({ queryKey: queryKeys.myProjects }),
                queryClient.invalidateQueries({ queryKey: queryKeys.myThreads }),
              ]);
            }
          } catch (saveError) {
            console.error('Failed to persist generation:', saveError);
          }

          // Persist assistant message to thread so follow-up turns
          // (refactor, fix, polish) have DB-backed context.
          if (accumulated.trim()) {
            await persistAssistantMessage(threadId, accumulated);
          }

          // Call onDone callback with serialized multi-file project
          onDone?.(serialized);
          return serialized;
        }

        // Chat-only response: no code files extracted. Call onDone with empty string.
        // Still persist the assistant message so the thread has a record.
        if (accumulated.trim()) {
          await persistAssistantMessage(threadId, accumulated);
        }
        onDone?.('');
        return '';
      } catch (err) {
        // AbortError means the user cancelled — don't treat as an error
        if (err instanceof DOMException && err.name === 'AbortError') {
          return '';
        }
        const errorObj =
          err instanceof Error ? err : new Error('Generation failed');
        setError(errorObj);
        onError?.(errorObj);
        throw errorObj;
      } finally {
        abortRef.current = null;
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
      queryClient,
      persistAssistantMessage,
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
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: queryKeys.myProjects }),
            queryClient.invalidateQueries({ queryKey: queryKeys.myThreads }),
          ]);
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

  /**
   * Agent turn — tool-calling loop via /api/agent/turn SSE stream.
   * Parses tool_call/tool_result/message events and accumulates files.
   */
  const agentTurn = useCallback(
    async (request: GenerationRequest, onToolEvent?: (evt: ToolEvent) => void) => {
      setIsLoading(true);
      setError(null);
      resetAccumulated();

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const authHeaders = await getAuthHeaders();
        if (!authHeaders) throw new Error('Unauthorized: please sign in again');

        const threadId = await ensureThread();
        const projectIdForTurn = useGenerationStore.getState().currentProjectId || currentProjectId;
        const res = await fetch('/api/agent/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders },
          body: JSON.stringify({
            projectId: projectIdForTurn,
            threadId,
            prompt: request.prompt,
            history: request.history || [],
            generationDirective: request.generationDirective,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (shouldFallbackFromAgentStatus(res.status)) {
            return null;
          }
          const raw = await res.text().catch(() => '');
          let message = `Agent request failed (HTTP ${res.status})`;
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as { error?: string; message?: string; details?: string };
              message = parsed.error || parsed.message || parsed.details || message;
            } catch {
              message = raw.slice(0, 1000);
            }
          }
          throw new Error(message);
        }

        if (!res.body) return null; // No SSE stream → fall back

        // Parse SSE: event: tool_call | tool_result | message | error | done
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let accumulated = '';
        let streamedFiles: Record<string, string> | null = null;
        let eventName = 'message';
        let dataLines: string[] = [];

        const flushEvent = () => {
          if (!dataLines.length) return;
          const raw = dataLines.join('\n');
          dataLines = [];
          try {
            const parsed = JSON.parse(raw);

            if (eventName === 'error') {
              throw new Error(parsed.message || 'Agent error');
            }

            if (eventName === 'tool_call') {
              const evt: ToolEvent = { type: 'tool_call', id: parsed.id, name: parsed.name, args: parsed.args || {} };
              onToolEvent?.(evt);
            } else if (eventName === 'tool_result') {
              const evt: ToolEvent = { type: 'tool_result', tool_call_id: parsed.tool_call_id, output: parsed.output, is_error: parsed.is_error };
              onToolEvent?.(evt);
            } else if (eventName === 'message') {
              if (parsed.content) {
                accumulated += parsed.content;
                appendAccumulated(parsed.content);
                onChunk?.(parsed.content);
              }
            } else if (eventName === 'files') {
              if (parsed.files && typeof parsed.files === 'object') {
                streamedFiles = parsed.files as Record<string, string>;
              }
            }
          } catch (err) {
            if (eventName === 'error') {
              throw err;
            }
            if (err instanceof Error) {
              // Parse error, skip
            } else {
              throw err;
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const rawLine of lines) {
            const line = rawLine.replace(/\r$/, '');
            if (!line) { flushEvent(); eventName = 'message'; continue; }
            if (line.startsWith(': ping')) continue;
            if (line.startsWith('event: ')) { eventName = line.slice(7).trim() || 'message'; continue; }
            if (line.startsWith('data: ')) { dataLines.push(line.slice(6)); continue; }
          }
        }
        flushEvent();

        const baseFiles = useGenerationStore.getState().files || undefined;
        let virtualFiles = streamedFiles
          ? (() => {
              const incoming = templateToVirtualFiles(streamedFiles);
              // Merge base files so unchanged files (config, layout, css, etc.)
              // are not dropped when the agent returns only changed files.
              const mergedFiles: Record<string, VirtualFile> = { ...(baseFiles?.files || {}) };
              for (const [p, f] of Object.entries(incoming.files)) {
                mergedFiles[p] = f;
              }
              // Prefer the base entry point — streamedFiles are a partial
              // update from the agent and templateToVirtualFiles may pick
              // a non-page file (e.g. package.json) as its fallback entry.
              const mergedEntry = baseFiles?.entryPath || incoming.entryPath;
              return { entryPath: mergedEntry, files: mergedFiles } as VirtualProjectFiles;
            })()
          : extractVirtualFiles(accumulated, baseFiles || undefined);

        if (!hasSubstantiveFiles(virtualFiles) && projectIdForTurn) {
          // Agent may have used write_file tools without putting code in the
          // assistant message. Reload persisted project_files as a fallback.
          try {
            const { user } = await supabase.auth.getUser();
            if (user) {
              const { data: fileRows } = await supabase
                .from('project_files')
                .select('path, content, language')
                .eq('project_id', projectIdForTurn)
                .neq('status', 'deleted');

              if (fileRows && fileRows.length > 0) {
                const entryPath = fileRows.find((row: { path: string }) => row.path === 'app/page.tsx')
                  ? 'app/page.tsx'
                  : fileRows[0]!.path;
                const files: Record<string, VirtualFile> = {};
                for (const row of fileRows) {
                  files[row.path] = {
                    path: row.path,
                    content: row.content || '',
                    language: row.language,
                    status: 'unchanged',
                  };
                }
                virtualFiles = { entryPath, files };
              }
            }
          } catch {
            // Fall back to whatever we parsed from the stream.
          }
        }

        if (!hasSubstantiveFiles(virtualFiles)) {
          return null;
        }

        const entryContent = virtualFiles.files[virtualFiles.entryPath]?.content || '';
        const serialized = serializeVirtualFilesWrapper(virtualFiles);
        let projectIdForPersistence = useGenerationStore.getState().currentProjectId || projectIdForTurn;

        useGenerationStore.setState({
          files: virtualFiles,
          activeFilePath: virtualFiles.entryPath,
        });

        useGenerationStore.getState().bumpPreviewNonce();

        setCurrentCode(entryContent);
        addVersion(serialized, 'Generated via agent');

        // Persist to Supabase
        try {
          if (projectIdForPersistence) {
            const flatFiles = Object.fromEntries(
              Object.entries(virtualFiles.files)
                .filter(([, file]) => file.status !== 'deleted')
                .map(([path, file]) => [path, file.content]),
            );
            await fetch(`/api/projects/${projectIdForPersistence}/save-code`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              body: JSON.stringify({
                code: serialized,
                files: flatFiles,
                prompt: request.prompt,
                description: 'Generated via agent',
                threadId,
              }),
            });
          } else {
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
                projectIdForPersistence = j.id;
                setProjectId(j.id);
                try {
                  await fetch(`/api/threads/${threadId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', ...authHeaders },
                    body: JSON.stringify({ projectId: j.id }),
                  });
                } catch {}
              }
            }
          }
          await queryClient.invalidateQueries({ queryKey: queryKeys.myProjects });
        } catch (saveError) {
          console.error('Failed to persist agent generation:', saveError);
        }

        // Persist assistant message to thread for follow-up context
        if (accumulated.trim()) {
          await persistAssistantMessage(threadId, accumulated);
        }

        onDone?.(serialized);
        return serialized;
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error('Agent turn failed');
        setError(errorObj);
        onError?.(errorObj);
        throw errorObj;
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [appendAccumulated, resetAccumulated, setCurrentCode, addVersion, onChunk, onDone, onError, currentProjectId, ensureThread, setProjectId, queryClient, persistAssistantMessage],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return {
    generate,
    agentTurn,
    generateFromTemplate,
    debug,
    isLoading,
    error,
    cancel,
    ensureThreadId: ensureThread,
  };
}

type ToolEvent = { type: 'tool_call'; id: string; name: string; args: Record<string, unknown> } | { type: 'tool_result'; tool_call_id: string; output: string; is_error?: boolean };
