/**
 * Debug Edge Function
 *
 * Debugs broken code with error message using AI with SSE streaming.
 * Uses same streaming pattern as /generate but with debug-focused system prompt.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DebugRequest {
  threadId: string;
  prompt?: string;
  code: string;
  errorMessage: string;
  history?: Array<{ role: string; content: string }>;
  language?: string;
  idempotencyKey?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Parse request body
    const { threadId, code, errorMessage, prompt, history = [], language, idempotencyKey }: DebugRequest = await req.json();

    if (!threadId) {
      return new Response(
        JSON.stringify({ error: 'threadId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!errorMessage) {
      return new Response(
        JSON.stringify({ error: 'Error message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Spend credits (basic debug)
    const creditsToSpend = 1;
    const { error: spendError } = await supabase.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: creditsToSpend,
      p_source: 'debug',
      p_description: 'Debug',
      p_idempotency_key: idempotencyKey || null,
      p_metadata: { language: language || null },
    });

    if (spendError) {
      const msg = spendError.message || 'Failed to spend credits';
      const status = msg.toLowerCase().includes('insufficient') ? 402 : 500;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Build messages array for AI with debug-focused system prompt
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

    // 4. Call AI API with streaming
    const apiKey = Deno.env.get('AI_API_KEY');
    const baseUrl = Deno.env.get('AI_BASE_URL') || 'https://api.groq.com/openai/v1';
    const model = Deno.env.get('AI_MODEL') || 'llama-3.3-70b-versatile';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Persist user message + create run/step
    await supabase.from('thread_messages').insert({
      thread_id: threadId,
      user_id: user.id,
      role: 'user',
      content: prompt || 'Debug this code',
      metadata: { source: 'debug', language: language || null, has_error: true },
    });

    const { data: run } = await supabase
      .from('runs')
      .insert({
        thread_id: threadId,
        user_id: user.id,
        status: 'running',
        objective: 'debug',
        idempotency_key: idempotencyKey || null,
        started_at: new Date().toISOString(),
        metadata: { model, credits: creditsToSpend, language: language || null },
      })
      .select('id')
      .single();

    const runId = run?.id || null;
    let stepId: string | null = null;
    if (runId) {
      const { data: step } = await supabase
        .from('run_steps')
        .insert({
          run_id: runId,
          step_index: 0,
          kind: 'llm',
          agent_name: 'edge',
          status: 'running',
          input: { language: language || null, hasErrorMessage: true },
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      stepId = step?.id || null;
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
        temperature: 0.3, // Lower temperature for debugging (more precise)
        max_tokens: 4096,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return new Response(
        JSON.stringify({ error: `AI API error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Stream the response
    const reader = aiResponse.body?.getReader();
    if (!reader) {
      return new Response(
        JSON.stringify({ error: 'No response body from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buffer = '';
          let assistantBuffer = '';
          let usage: { input_tokens?: number; output_tokens?: number } | null = null;

          while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // Send [DONE] sentinel
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              break;
            }

            // Decode chunk
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6); // Remove 'data: ' prefix

                // Check for [DONE] before parsing
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
                  // Extract delta content
                  const content = parsed.choices?.[0]?.delta?.content || '';
                  if (content) {
                    assistantBuffer += content;
                    // Send SSE format
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                  }
                } catch (e) {
                  // Skip invalid JSON
                  console.error('Failed to parse SSE data:', data);
                }
              }
            }
          }

          controller.close();

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
              metadata: { source: 'debug', run_id: runId },
            });
          }

          await supabase
            .from('threads')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', threadId);

          if (runId) {
            await supabase.from('ai_usage_ledger').insert({
              user_id: user.id,
              run_id: runId,
              model,
              input_tokens: usage?.input_tokens ?? null,
              output_tokens: usage?.output_tokens ?? null,
              cost_usd: null,
              credits_charged: creditsToSpend,
              metadata: { source: 'debug', language: language || null },
            });

            if (stepId) {
              await supabase
                .from('run_steps')
                .update({ status: 'succeeded', ended_at: new Date().toISOString(), output: { ok: true } })
                .eq('id', stepId);
            }
            await supabase
              .from('runs')
              .update({ status: 'succeeded', ended_at: new Date().toISOString() })
              .eq('id', runId);
          }
        } catch (error) {
          console.error('Streaming error:', error);
          try {
            if (stepId) {
              await supabase
                .from('run_steps')
                .update({ status: 'failed', error: String(error), ended_at: new Date().toISOString() })
                .eq('id', stepId);
            }
            if (runId) {
              await supabase
                .from('runs')
                .update({ status: 'failed', error: String(error), ended_at: new Date().toISOString() })
                .eq('id', runId);
            }
          } catch {
            // ignore
          }
          controller.error(error);
        }
      },
    });

    // 6. Return SSE stream
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Debug function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
