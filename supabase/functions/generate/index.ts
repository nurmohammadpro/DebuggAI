/**
 * Generate Edge Function
 *
 * Generates code from user prompt using AI with SSE streaming.
 * Handles authentication, context retrieval, and streaming response.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRequest {
  threadId: string;
  prompt: string;
  history?: Array<{ role: string; content: string }>;
  idempotencyKey?: string;
  /**
   * When true (default), the function writes the user prompt to thread_messages.
   * When false, callers are responsible for persisting the user message.
   */
  persistUserMessage?: boolean;
  /** Credit amount to spend (defaults to 1 for debug, 20+ for web builder) */
  creditAmount?: number;
  /** Source label for credit transaction (defaults to "generate") */
  creditSource?: string;
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
    const {
      threadId,
      prompt,
      history = [],
      idempotencyKey,
      persistUserMessage = true,
      creditAmount,
      creditSource,
    }: GenerateRequest = await req.json();

    if (!threadId) {
      return new Response(
        JSON.stringify({ error: 'threadId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Spend credits — use request-provided amount or default to 1 (debug)
    const creditsToSpend = typeof creditAmount === 'number' && creditAmount > 0
      ? creditAmount
      : 1;
    const sourceLabel = creditSource || 'generate';
    const { error: spendError } = await supabase.rpc('spend_credits', {
      p_user_id: user.id,
      p_amount: creditsToSpend,
      p_source: sourceLabel,
      p_description: `Generate: ${prompt.slice(0, 100)}`,
      p_idempotency_key: idempotencyKey || null,
      p_metadata: {},
    });

    if (spendError) {
      const msg = spendError.message || 'Failed to spend credits';
      const status = msg.toLowerCase().includes('insufficient') ? 402 : 500;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fetch recent thread messages for context
    const { data: messages, error: messagesError } = await supabase
      .from('thread_messages')
      .select('role, content, created_at')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(20);

    let conversationHistory: Array<{ role: string; content: string }> = [];
    if (!messagesError && messages) {
      conversationHistory = messages.reverse().map((m: any) => ({ role: m.role, content: m.content }));
    }
    // 4. Build messages array for AI
    const systemPrompt = `You are DeBuggAI, an expert Next.js engineer and friendly technical assistant.

Goal: Generate a complete, runnable Next.js 14+ project using the App Router. Your output will be unzipped and the user will run \`npm install && npm run dev\` immediately — so every file must be present and correct.

## CRITICAL RESPONSE FORMAT — FOLLOW EXACTLY:

**STEP 1 — ALWAYS start with a plain-text explanation (2-4 sentences):**
Explain what you are building, what approach you are taking, and what key technologies you are using. Write this as friendly, direct prose. This text appears in the chat pane for the user to read.

**STEP 2 — Output all code files using file markers:**
Every file uses this exact format:
// File: app/page.tsx
\`\`\`tsx
...code...
\`\`\`

**STEP 3 — ALWAYS end with a summary:**
After all code blocks, add a short bullet list of the key files and what they do. Example:
**What's included:**
- \`app/page.tsx\` — Main landing page with hero and CTA sections
- \`components/Button.tsx\` — Reusable button with variants
- \`app/globals.css\` — Tailwind base styles and custom CSS variables

---

## Hard rules:
1. Output MUST be a complete file tree (a project), not a single snippet or component. Every response must include ALL files needed for \`npm run dev\` to succeed.
2. Use App Router only (\`app/\` directory, NOT \`pages/\`). Do NOT use the Pages Router.
3. REQUIRED files (MUST include ALL of these):
   - \`package.json\` — with complete, valid dependencies (next, react, react-dom, and any additional deps). Use latest stable versions.
   - \`tsconfig.json\` — standard Next.js TypeScript config with \`@/*\` path alias.
   - \`next.config.js\` — minimal config matching Next.js 14+.
   - \`app/layout.tsx\` — root layout with HTML, metadata export, and children rendering.
   - \`app/page.tsx\` — main page implementing the user request.
   - \`app/globals.css\` — Tailwind directives plus any custom styles.
   - \`tailwind.config.ts\` — with content paths scanning your file tree.
   - \`postcss.config.mjs\` — with tailwindcss and autoprefixer plugins.
4. Use TypeScript by default (\`.ts\` / \`.tsx\`).
5. Dependencies in \`package.json\` MUST be consistent with all imports used in your code files.
6. Default to Tailwind CSS for styling.
7. Use the \`@/\` import alias for local imports.
8. Decision confirmation: Before making structural changes (new dependencies, schema changes, restructuring files), ask the user first.
9. Use either root-level \`app/\` OR \`src/app/\` — be consistent across all files.`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      ...history,
      { role: 'user', content: prompt },
    ];

    // 5. Call AI API with streaming
    const apiKey = Deno.env.get('AI_API_KEY');
    const baseUrl = Deno.env.get('AI_BASE_URL') || 'https://api.deepseek.com/v1';
    const model = Deno.env.get('AI_MODEL') || 'deepseek-chat';

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Persist user message (optional) + create run/step
    if (persistUserMessage) {
      await supabase.from('thread_messages').insert({
        thread_id: threadId,
        user_id: user.id,
        role: 'user',
        content: prompt,
        metadata: { source: 'generate' },
      });
    }

    const { data: run } = await supabase
      .from('runs')
      .insert({
        thread_id: threadId,
        user_id: user.id,
        status: 'running',
        objective: 'generate',
        idempotency_key: idempotencyKey || null,
        started_at: new Date().toISOString(),
        metadata: { model, credits: creditsToSpend },
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
          input: { prompt },
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      stepId = step?.id || null;

      // Create job record for lifecycle consistency with agent-worker path
      await supabase.from('jobs').insert({
        run_id: runId,
        queue: 'llm',
        status: 'running',
        kind: 'llm',
        payload: { kind: 'llm', objective: 'generate', source: 'edge-function' },
      });
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
        temperature: 0.7,
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(55_000),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return new Response(
        JSON.stringify({ error: `AI API error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Stream the response
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
              metadata: { source: 'generate', run_id: runId },
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
              metadata: { source: 'generate' },
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

            // Mark job succeeded (lifecycle consistent with agent-worker)
            await supabase
              .from('jobs')
              .update({ status: 'succeeded', locked_until: null, updated_at: new Date().toISOString() })
              .eq('run_id', runId)
              .eq('kind', 'llm');

            // Audit log
            await supabase.from('audit_events').insert({
              user_id: user.id,
              action: 'run.completed',
              details: { source: 'generate', credits: creditsToSpend, model },
              target_type: 'run',
              target_id: runId,
            });
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

              await supabase
                .from('jobs')
                .update({ status: 'failed', last_error: String(error), locked_until: null, updated_at: new Date().toISOString() })
                .eq('run_id', runId)
                .eq('kind', 'llm');

              // Audit log
              await supabase.from('audit_events').insert({
                user_id: user.id,
                action: 'run.failed',
                details: { source: 'generate', error: String(error) },
                target_type: 'run',
                target_id: runId,
              });
            }
          } catch {
            // ignore
          }
          controller.error(error);
        }
      },
    });

    // 7. Return SSE stream
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Generate function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
