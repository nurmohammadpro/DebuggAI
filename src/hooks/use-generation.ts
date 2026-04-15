/**
 * useGeneration Hook
 *
 * Custom hook for handling AI code generation with SSE streaming.
 * Used by both the web builder and debugger.
 */

import { useState, useCallback, useRef } from 'react';
import { useGenerationStore } from '@/store/generation-store';
import { parseSSEResponseWithCallback } from '@/lib/sse-parser';
import { extractCode } from '@/lib/extract-code';

interface UseGenerationOptions {
  onChunk?: (chunk: string) => void;
  onDone?: (code: string) => void;
  onError?: (error: Error) => void;
}

interface GenerationRequest {
  prompt: string;
  history?: Array<{ role: string; content: string }>;
  code?: string; // For debugging: existing broken code
  errorMessage?: string; // For debugging: error message
}

export function useGeneration(options: UseGenerationOptions = {}) {
  const { onChunk, onDone, onError } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { appendAccumulated, resetAccumulated, setCurrentCode, addVersion } =
    useGenerationStore();

  // Track if this is a debug request
  const isDebugRequest = useRef(false);

  /**
   * Generate code from AI prompt with SSE streaming
   */
  const generate = useCallback(
    async (request: GenerationRequest) => {
      setIsLoading(true);
      setError(null);
      resetAccumulated();

      // Determine if this is a debug request
      isDebugRequest.current = !!(
        request.code && request.errorMessage
      );

      try {
        const endpoint = isDebugRequest.current ? '/debug' : '/generate';

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
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
        const description = isDebugRequest.current
          ? 'Debugged fix'
          : 'Generated';
        addVersion(code, description);

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
    [appendAccumulated, resetAccumulated, setCurrentCode, addVersion, onChunk, onDone, onError]
  );

  /**
   * Debug code with error message
   * Convenience method for debugging
   */
  const debug = useCallback(
    async (code: string, errorMessage: string) => {
      return generate({
        prompt: 'Debug this code',
        code,
        errorMessage,
      });
    },
    [generate]
  );

  return {
    generate,
    debug,
    isLoading,
    error,
  };
}
