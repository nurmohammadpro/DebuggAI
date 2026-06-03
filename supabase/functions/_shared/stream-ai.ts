/**
 * Shared AI SSE Streaming Utility
 *
 * Used by generate, debug, and debug-analyze edge functions.
 * Handles SSE parsing, token extraction, and response finalization.
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export interface StreamAIOptions {
  /** AI model to use */
  model: string;
  /** Built messages array (system + user + history) */
  messages: Array<{ role: string; content: string }>;
  /** API base URL */
  baseUrl: string;
  /** API key */
  apiKey: string;
  /** Temperature */
  temperature?: number;
  /** Max tokens */
  maxTokens?: number;
  /** Supabase client (service role for writes) */
  supabase: any;
  /** Authenticated user */
  user: { id: string };
  /** Thread ID */
  threadId: string;
  /** Run ID (must exist in runs table) */
  runId: string | null;
  /** Step ID (must exist in run_steps table) */
  stepId: string | null;
  /** Credits spent */
  creditsSpent?: number;
  /** Metadata for the assistant message */
  metadata?: Record<string, unknown>;
}

export function createSSEStream(opts: StreamAIOptions): ReadableStream {
  const {
    model,
    messages,
    baseUrl,
    apiKey,
    temperature = 0.7,
    maxTokens = 16384,
    supabase,
    user,
    threadId,
    runId,
    stepId,
    creditsSpent = 1,
    metadata = {},
  } = opts;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  let cancelled = false;

  return new ReadableStream({
    async start(controller) {
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      try {
        const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            stream: true,
            temperature,
            max_tokens: maxTokens,
          }),
          // Deno Edge Functions have ~150s wall clock.
          // 120s gives breathing room before Deno kills us, while
          // still being shorter than the container timeout so we can
          // write a clean error instead of dropping mid-stream.
          signal: AbortSignal.timeout(120_000),
        });

        if (!aiResponse.ok) {
          const errText = await aiResponse.text();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `AI API error: ${errText}` })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          if (stepId) {
            await supabase.from('run_steps').update({ status: 'failed', error: errText, ended_at: new Date().toISOString() }).eq('id', stepId);
          }
          if (runId) {
            await supabase.from('runs').update({ status: 'failed', error: errText, ended_at: new Date().toISOString() }).eq('id', runId);
          }
          return;
        }

        reader = aiResponse.body?.getReader() ?? null;
        if (!reader) {
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        let buffer = '';
        let assistantBuffer = '';
        let usage: { input_tokens?: number; output_tokens?: number } | null = null;

        // Heartbeat: ping every 15s to keep host LB (Caddy/Hostinger) from
        // closing the SSE stream during long silent periods (model thinking).
        const heartbeat = setInterval(() => {
          if (!cancelled) {
            try { controller.enqueue(encoder.encode(': ping\n\n')); } catch {}
          }
        }, 15_000);

        try {
          while (true) {
            if (cancelled) break;
            const { done, value } = await reader.read();

            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              break;
            }

            buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const u = parsed?.x_groq?.usage || parsed?.usage;
                if (u && typeof u === 'object') {
                  usage = {
                    input_tokens: typeof u.prompt_tokens === 'number' ? u.prompt_tokens : u.input_tokens,
                    output_tokens: typeof u.completion_tokens === 'number' ? u.completion_tokens : u.output_tokens,
                  };
                }
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  assistantBuffer += content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                }
              } catch {
                // Skip invalid JSON lines
              }
            }
          }
        }

          }
        } finally {
          clearInterval(heartbeat);
        }

        controller.close();

        // Finalization (non-blocking)
        const finalText = assistantBuffer.trim();
        if (finalText) {
          await supabase.from('thread_messages').insert({
            thread_id: threadId,
            user_id: user.id,
            role: 'assistant',
            content: finalText,
            model,
            tokens_in: usage?.input_tokens ?? null,
            tokens_out: usage?.output_tokens ?? null,
            metadata: { ...metadata, run_id: runId },
          });
        }

        await supabase.from('threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);

        if (runId) {
          await supabase.from('ai_usage_ledger').insert({
            user_id: user.id,
            run_id: runId,
            model,
            input_tokens: usage?.input_tokens ?? null,
            output_tokens: usage?.output_tokens ?? null,
            credits_charged: creditsSpent,
            metadata,
          });

          if (stepId) {
            await supabase.from('run_steps').update({ status: 'succeeded', ended_at: new Date().toISOString(), output: { ok: true } }).eq('id', stepId);
          }
          await supabase.from('runs').update({ status: 'succeeded', ended_at: new Date().toISOString() }).eq('id', runId);

          await supabase.from('jobs')
            .update({ status: 'succeeded', locked_until: null, updated_at: new Date().toISOString() })
            .eq('run_id', runId)
            .eq('kind', 'llm');

          await supabase.from('audit_events').insert({
            user_id: user.id,
            action: 'run.completed',
            details: { ...metadata, credits: creditsSpent, model },
            target_type: 'run',
            target_id: runId,
          });
        }
      } catch (error) {
        console.error('SSE stream error:', error);
        const msg = error instanceof Error ? error.message : String(error);

        try {
          if (stepId) {
            await supabase.from('run_steps').update({ status: 'failed', error: msg, ended_at: new Date().toISOString() }).eq('id', stepId);
          }
          if (runId) {
            await supabase.from('runs').update({ status: 'failed', error: msg, ended_at: new Date().toISOString() }).eq('id', runId);
            await supabase.from('jobs')
              .update({ status: 'failed', last_error: msg, locked_until: null, updated_at: new Date().toISOString() })
              .eq('run_id', runId)
              .eq('kind', 'llm');
            await supabase.from('audit_events').insert({
              user_id: user.id,
              action: 'run.failed',
              details: { ...metadata, error: msg },
              target_type: 'run',
              target_id: runId,
            });
          }
        } catch { /* ignore */ }

        if (!cancelled) controller.error(error);
      }
    },
    cancel() {
      cancelled = true;
    },
  });
}

export function createStreamResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
