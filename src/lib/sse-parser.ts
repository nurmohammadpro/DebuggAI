/**
 * SSE (Server-Sent Events) Parser
 *
 * Parses streaming responses from AI edge functions.
 * Handles chunk buffering, line parsing, and [DONE] sentinel detection.
 */

export interface SSEResponse {
  accumulated: string;
  isDone: boolean;
}

/**
 * Parse SSE stream from AI response
 * @param response - Fetch Response with ReadableStream body
 * @returns Promise with accumulated text and done status
 */
export async function parseSSEResponse(
  response: Response
): Promise<SSEResponse> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split into lines
      const lines = buffer.split('\n');
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6); // Remove 'data: ' prefix

          // CRITICAL: Check for [DONE] before JSON.parse
          if (data === '[DONE]') {
            return { accumulated, isDone: true };
          }

          try {
            const parsed = JSON.parse(data);
            // Extract delta content from OpenAI/Groq format
            const content = parsed.choices?.[0]?.delta?.content ||
                           parsed.content ||
                           '';
            accumulated += content;
          } catch {
            console.warn('Failed to parse SSE data:', data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { accumulated, isDone: true };
}

/**
 * Parse SSE stream with callback for each chunk
 * @param response - Fetch Response with ReadableStream body
 * @param onChunk - Callback called with each delta chunk
 * @returns Promise with final accumulated text
 */
export async function parseSSEResponseWithCallback(
  response: Response,
  onChunk: (chunk: string) => void
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let accumulated = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);

          if (data === '[DONE]') {
            return accumulated;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content ||
                           parsed.content ||
                           '';
            if (content) {
              accumulated += content;
              onChunk(content);
            }
          } catch {
            console.warn('Failed to parse SSE data:', data);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return accumulated;
}
