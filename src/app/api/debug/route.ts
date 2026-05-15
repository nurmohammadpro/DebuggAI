/**
 * Debug API Route
 *
 * Run-based debug endpoint.
 *
 * - Requires threadId
 * - Creates run + step
 * - Spends credits atomically
 * - Streams model output while buffering final content
 * - Persists assistant message + run state + usage ledger at end
 */

import { requireUser } from '@/lib/server/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;
  const user = auth.user!;
  const supa = auth.supabase;

  try {
    const body = await req.json();
    const { threadId, code, errorMessage, prompt, history = [], language, idempotencyKey } = body as {
      threadId?: string;
      code?: string;
      errorMessage?: string;
      prompt?: string;
      history?: Array<{ role: string; content: string }>;
      language?: string;
      idempotencyKey?: string | null;
    };

    if (!threadId) return NextResponse.json({ error: 'threadId is required' }, { status: 400 });
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }
    if (!errorMessage) {
      return NextResponse.json({ error: 'Error message is required' }, { status: 400 });
    }

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

    // Spend credits atomically (idempotent).
    const { error: spendError } = await supa.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: creditsToSpend,
      p_source: 'debug',
      p_description: 'Debug',
      p_idempotency_key: effectiveIdemKey,
      p_metadata: { model },
    });

    if (spendError) {
      const msg = spendError.message || 'Failed to spend credits';
      const status = /insufficient/i.test(msg) ? 402 : 500;
      return NextResponse.json({ error: msg }, { status });
    }

    const languageHint = language
      ? `The code is written in ${language}.`
      : 'The code language will be apparent from the syntax.';

    const systemPrompt = `You are DeBuggAI, an expert code debugger. You receive broken code and an error message, then provide a corrected version.

Rules:
1. Analyze the error message and identify the root cause
2. Provide the corrected code in a markdown code block
3. Include a brief explanation of what was wrong and how it was fixed
4. Follow the same code style and patterns as the original
5. Only fix the specific error - don't refactor unless necessary
6. If the error is a simple typo or missing import, just fix it
7. If the error indicates a logic problem, explain the issue
8. Always return complete, working code

${languageHint}`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...history,
      {
        role: 'user',
        content: prompt || 'Debug this code',
      },
      {
        role: 'user',
        content: `**Code:**\n\`\`\`\n${code}\n\`\`\`\n\n**Error:**\n${errorMessage}`,
      },
    ];

    // Persist user message (single message that contains code+error for traceability)
    await supa.from('thread_messages').insert({
      thread_id: threadId,
      user_id: user.id,
      role: 'user',
      content: prompt || 'Debug this code',
      metadata: { source: 'debug', language: language || null, has_error: true },
    });
    await supa.from('threads').update({ updated_at: new Date().toISOString() }).eq('id', threadId);

    // Create run + step.
    const { data: run, error: runError } = await supa
      .from('runs')
      .insert({
        thread_id: threadId,
        user_id: user.id,
        status: 'running',
        objective: 'debug',
        idempotency_key: effectiveIdemKey,
        started_at: new Date().toISOString(),
        metadata: { model, credits: creditsToSpend, language: language || null },
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
        input: { prompt, language, hasErrorMessage: true },
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (stepError || !step) {
      await supa.from('runs').update({ status: 'failed', error: stepError?.message || 'Failed to create run step' }).eq('id', run.id);
      return NextResponse.json({ error: stepError?.message || 'Failed to create run step' }, { status: 500 });
    }

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
        temperature: 0.3,
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
              metadata: { source: 'debug', run_id: run.id },
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
            metadata: { source: 'debug', language: language || null },
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
    console.error('Debug API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
