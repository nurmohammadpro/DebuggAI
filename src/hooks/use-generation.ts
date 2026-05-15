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
import { parseSSEResponseWithCallback } from '@/lib/sse-parser';
import { extractCode } from '@/lib/extract-code';
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
  } = useGenerationStore();

  const getAuthHeaders = async () => {
    const { session } = await getSession();
    if (!session?.access_token) return null;
    return { Authorization: `Bearer ${session.access_token}` };
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
        const response = await fetch('/api/generate', {
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

        // Extract code from markdown response
        const code = extractCode(accumulated);

        if (!code) {
          throw new Error('No code found in AI response');
        }

        // Update current code
        setCurrentCode(code);

        // Save as new version
        addVersion(code, 'Generated');

        // Persistence to Supabase
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            if (currentProjectId) {
              // Update existing project
              await supabase
                .from('generations')
                .update({ 
                  code,
                  // In a real app we might increment version, but for now just update
                })
                .eq('id', currentProjectId);
            } else {
              // Create new canonical project (+ initial generation) via API.
              const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({
                  code,
                  prompt: request.prompt,
                  description: request.prompt.slice(0, 50),
                  stack: null,
                  metadata: {},
                }),
              });
              if (res.ok) {
                const j = await res.json().catch(() => ({}));
                if (j?.id) setProjectId(j.id);
              }
            }
            // Invalidate the projects query so the sidebar updates
            await queryClient.invalidateQueries({ queryKey: queryKeys.myProjects });
          }
        } catch (saveError) {
          console.error('Failed to persist generation:', saveError);
        }

        // Call onDone callback
        onDone?.(code);

        return code;
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

        // Extract code from markdown response
        const fixedCode = extractCode(accumulated);

        if (!fixedCode) {
          throw new Error('No code found in debug response');
        }

        // Update current code
        setCurrentCode(fixedCode);

        // Save as new version
        addVersion(fixedCode, 'Debugged fix');

        // Call onDone callback
        onDone?.(fixedCode);

        return fixedCode;
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
    debug,
    isLoading,
    error,
  };
}
