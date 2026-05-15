/**
 * Generate API Route
 *
 * Run-based generation endpoint.
 *
 * - Requires threadId
 * - Creates a run + step
 * - Spends credits atomically (idempotent when key provided)
 * - Streams model output (SSE) while buffering final content
 * - Persists assistant message and usage ledger at the end
 */

import { requireUser } from '@/lib/server/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are DeBuggAI, an expert code generator. Generate clean, production-ready code based on user requirements.

Rules:
1. Always respond with a code block in the appropriate language
2. Include helpful comments in the code
3. Follow best practices for the requested framework/language
4. If the request is for React/Next.js, provide complete, working components
5. Keep explanations concise and focus on the code
6. Use markdown format with \`\`\`language code fences`;

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;
  const user = auth.user!;
  const supa = auth.supabase;

  try {
    const body = await req.json();
    const {
      threadId,
      prompt,
      history = [],
      idempotencyKey,
    } = body as {
      threadId?: string;
      prompt?: string;
      history?: Array<{ role: string; content: string }>;
      idempotencyKey?: string | null;
    };

    if (!threadId) return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    const apiKey = process.env.AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API key not configured' }, { status: 500 });
    }

    const baseUrl = process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';
    const model = process.env.AI_MODEL || 'llama-3.3-70b-versatile';

    const creditsToSpend = 1;
    const effectiveIdemKey =
      (typeof idempotencyKey === 'string' && idempotencyKey.trim()) ||
      req.headers.get('idempotency-key') ||
      req.headers.get('Idempotency-Key') ||
      null;

    // 1) Spend credits atomically (idempotent).
    const { error: spendError } = await supa.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: creditsToSpend,
      p_source: 'generate',
      p_description: 'Generate',
      p_idempotency_key: effectiveIdemKey,
      p_metadata: { model },
    });

    if (spendError) {
      const msg = spendError.message || 'Failed to spend credits';
      const status = /insufficient/i.test(msg) ? 402 : 500;
      return NextResponse.json({ error: msg }, { status });
    }

    // 2) Persist user message.
    await supa.from('thread_messages').insert({
      thread_id: threadId,
      user_id: user.id,
      role: 'user',
      content: prompt,
      metadata: { source: 'generate' },
    });
    await supa.from('threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);

    // 3) Create run + step.
    const { data: run, error: runError } = await supa
      .from('runs')
      .insert({
        thread_id: threadId,
        user_id: user.id,
        status: 'running',
        objective: 'generate',
        idempotency_key: effectiveIdemKey,
        started_at: new Date().toISOString(),
        metadata: { model, credits: creditsToSpend },
      })
      .select('id')
      .single();

    if (runError || !run) {
      return NextResponse.json({ error: runError?.message || 'Failed to create run' }, { status: 500 });
    }

    const { data: step, error: stepError } = await supa
      .from('run_steps')
      .insert({
        run_id: run.id,
        step_index: 0,
        kind: 'llm',
        agent_name: 'primary',
        status: 'running',
        input: { prompt, history },
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (stepError || !step) {
      await supa.from('runs').update({ status: 'failed', error: stepError?.message || 'Failed to create run step' }).eq('id', run.id);
      return NextResponse.json({ error: stepError?.message || 'Failed to create run step' }, { status: 500 });
    }

    const aiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: prompt },
    ];

    const aiResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: aiMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      await supa.from('run_steps').update({ status: 'failed', error: text, ended_at: new Date().toISOString() }).eq('id', step.id);
      await supa.from('runs').update({ status: 'failed', error: text, ended_at: new Date().toISOString() }).eq('id', run.id);
      return NextResponse.json({ error: `AI API error: ${text}` }, { status: 502 });
    }

    const reader = aiResponse.body?.getReader();
    if (!reader) {
      const err = 'No response body from AI';
      await supa.from('run_steps').update({ status: 'failed', error: err, ended_at: new Date().toISOString() }).eq('id', step.id);
      await supa.from('runs').update({ status: 'failed', error: err, ended_at: new Date().toISOString() }).eq('id', run.id);
      return NextResponse.json({ error: err }, { status: 502 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    let assistantBuffer = '';
    let usage: { input_tokens?: number; output_tokens?: number } | null = null;

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
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
                } catch { /* skip invalid JSON */ }
              }
            }
          }
          controller.close();

          const finalText = assistantBuffer.trim();
          if (finalText) {
            await supa.from('thread_messages').insert({
              thread_id: threadId,
              user_id: user.id,
              role: 'assistant',
              content: finalText,
              model,
              tokens_in: usage?.input_tokens ?? null,
              tokens_out: usage?.output_tokens ?? null,
              metadata: { source: 'generate', run_id: run.id },
            });
            await supa.from('threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);
          }

          await supa.from('ai_usage_ledger').insert({
            user_id: user.id,
            run_id: run.id,
            model,
            input_tokens: usage?.input_tokens ?? null,
            output_tokens: usage?.output_tokens ?? null,
            cost_usd: null,
            credits_charged: creditsToSpend,
            metadata: { source: 'generate' },
          });

          await supa.from('run_steps').update({ status: 'succeeded', ended_at: new Date().toISOString(), output: { ok: true } }).eq('id', step.id);
          await supa.from('runs').update({ status: 'succeeded', ended_at: new Date().toISOString() }).eq('id', run.id);
        } catch (err) {
          try {
            await supa.from('run_steps').update({ status: 'failed', error: String(err), ended_at: new Date().toISOString() }).eq('id', step.id);
            await supa.from('runs').update({ status: 'failed', error: String(err), ended_at: new Date().toISOString() }).eq('id', run.id);
          } catch {
            // ignore
          }
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
