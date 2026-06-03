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

/**
 * SSE stream with reconnection + backoff.
 * When the stream drops mid-generation (network blip, LB timeout),
 * automatically reconnects with exponential backoff.
 *
 * @param fetchFn — function that returns a new fetch Response (re-creates the request)
 * @param onChunk — called with each delta chunk
 * @param maxRetries — maximum reconnection attempts (default 3)
 * @returns final accumulated text
 */
export async function parseSSEWithReconnect(
  fetchFn: () => Promise<Response>,
  onChunk: (chunk: string) => void,
  maxRetries = 3,
): Promise<string> {
  let accumulated = '';
  let retries = 0;

  const processStream = async (response: Response): Promise<boolean> => {
    const reader = response.body?.getReader();
    if (!reader) return false;

    const decoder = new TextDecoder();
    let buffer = '';
    let reachedDone = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          // Skip heartbeat pings
          if (line.startsWith(': ping')) continue;

          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            if (data === '[DONE]') {
              reachedDone = true;
              return true;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || parsed.content || '';
              if (content) {
                accumulated += content;
                onChunk(content);
              }
            } catch { /* skip invalid */ }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return reachedDone;
  };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchFn();
      if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(err || `HTTP ${response.status}`);
      }

      const reachedDone = await processStream(response);
      if (reachedDone) return accumulated;

      // Stream ended without [DONE] — retry
      if (attempt < maxRetries) {
        retries++;
        const delay = Math.min(1000 * Math.pow(2, retries), 10000);
        console.warn(`[SSE] Stream ended without DONE, reconnecting in ${delay}ms (attempt ${retries}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (err) {
      if (attempt < maxRetries) {
        retries++;
        const delay = Math.min(1000 * Math.pow(2, retries), 10000);
        console.warn(`[SSE] Connection error, reconnecting in ${delay}ms:`, err instanceof Error ? err.message : err);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        const message = err instanceof Error ? err.message : 'Stream connection failed';
        throw new Error(message);
      }
    }
  }

  return accumulated;
}
