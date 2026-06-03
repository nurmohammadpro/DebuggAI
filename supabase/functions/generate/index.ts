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

function extractPlainChatText(full: string) {
  // The system prompt requires:
  // 1) plain-text explanation
  // 2) file blocks using `// File: ...` + code fences
  // 3) a summary
  //
  // For chat history, we only want the plain-text explanation so the chat pane
  // doesn't get flooded with code.
  const trimmed = (full || '').trim();
  if (!trimmed) return '';

  const lines = trimmed.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const isFileMarker = /^\s*\/\/\s*File:\s+[\w./-]+\.[a-zA-Z0-9]+\s*$/.test(line);
    const isFence = /^\s*```/.test(line);
    if (isFileMarker || isFence) break;
    out.push(line);
  }

  return out.join('\n').trim();
}

type DbAiProviderConfig = {
  enabled: boolean;
  base_url: string;
  model: string;
  api_key: string | null;
};

// Module-level cache for ai_provider_config to cut Supabase reads ~90% on hot path.
// Deno edge functions share one isolate per deployment; the cache lives as long
// as the isolate stays warm (typically minutes). 60s TTL balances freshness vs. cost.
let _providerCache: { value: DbAiProviderConfig | null; ts: number } | null = null;
const PROVIDER_CACHE_TTL_MS = 60_000;

async function getCachedProviderConfig(
  adminClient: ReturnType<typeof createClient>,
): Promise<DbAiProviderConfig | null> {
  const now = Date.now();
  if (_providerCache && (now - _providerCache.ts) < PROVIDER_CACHE_TTL_MS) {
    return _providerCache.value;
  }
  const { data } = await adminClient
    .from('ai_provider_config')
    .select('enabled, base_url, model, api_key')
    .eq('key', 'primary')
    .maybeSingle();
  const cfg = (data as DbAiProviderConfig | null) || null;
  _providerCache = { value: cfg, ts: now };
  return cfg;
}

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

    // Multi-provider AI config (service role).
    // Supports: DeepSeek (primary), Groq (fast fallback).
    // Falls back to env vars for backwards compatibility.
    let aiApiKey = (Deno.env.get('AI_API_KEY') || '').trim();
    let aiBaseUrl = (Deno.env.get('AI_BASE_URL') || 'https://api.deepseek.com/v1').trim();
    let aiModel = (Deno.env.get('AI_MODEL') || 'deepseek-chat').trim();

    // Groq provider (fast, cheap — used as fallback or for small edits)
    let groqApiKey = (Deno.env.get('GROQ_API_KEY') || '').trim();
    let groqBaseUrl = (Deno.env.get('GROQ_BASE_URL') || 'https://api.groq.com/openai/v1').trim();
    let groqModel = (Deno.env.get('GROQ_MODEL') || 'llama-3.3-70b-versatile').trim();
    let useGroq = false; // Default: DeepSeek

    try {
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
      if (serviceKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceKey);
        const cfg = getCachedProviderConfig(supabaseAdmin);
        if (cfg && cfg.enabled) {
          const base = String(cfg.base_url || '').trim();
          const model = String(cfg.model || '').trim();
          const key = typeof cfg.api_key === 'string' ? cfg.api_key.trim() : '';
          if (base) aiBaseUrl = base;
          if (model) aiModel = model;
          if (key) aiApiKey = key;
        }

        // Also check Groq provider config
        const { data: groqCfg } = await supabaseAdmin
          .from('ai_provider_config')
          .select('enabled, base_url, model, api_key')
          .eq('key', 'groq')
          .maybeSingle();

        const gCfg = groqCfg as DbAiProviderConfig | null;
        if (gCfg && gCfg.enabled && gCfg.api_key) {
          groqApiKey = gCfg.api_key;
          if (gCfg.base_url) groqBaseUrl = gCfg.base_url;
          if (gCfg.model) groqModel = gCfg.model;
        }
      }
    } catch {
      // best-effort: keep env fallback
    }

    // Provider routing: detect intent, prefer Groq for small edits
    const promptLower = prompt.toLowerCase();
    const isSmallEdit = /change|fix|update|edit|modify|replace|remove|add (a|the) |rename|tweak|adjust/i.test(promptLower);
    if (isSmallEdit && groqApiKey) {
      useGroq = true;
    }

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
    const systemPrompt = `You are DeBuggAI, an expert Next.js engineer. You work INSIDE the user's project using tools to explore, read, and edit files surgically.

## HOW YOU WORK
You have access to tools: list_dir, view_file, write_file, line_replace, search_files. Use them like a real engineer:
1. **Explore first** — use list_dir to see what files exist
2. **Read before editing** — use view_file to see current code
3. **Edit surgically** — use line_replace for small changes (preferred). Use write_file only for new files or full rewrites.
4. **Search** — use search_files to find where patterns or symbols are used

## FORMAT
- First, write a 1-2 sentence plan of what you'll do in plain English
- Then use tools to make the changes
- After all changes, briefly summarize what you did in plain English

## HARD RULES
1. Use App Router only (app/ directory, NOT pages/)
2. TypeScript by default (.ts / .tsx)
3. Tailwind CSS for styling
4. Edit globals.css CSS variables for colors — never hardcode raw hex in JSX
5. Keep edits SMALL. One logical change per response. Don't rewrite the whole project.
6. If the project is empty and the user asks you to build something, bootstrap the required files (package.json, tsconfig.json, next.config.js, app/layout.tsx, app/page.tsx, app/globals.css, tailwind.config.ts, postcss.config.mjs)
7. Use @/ import alias for local imports
8. Before adding new dependencies, ask the user first

## RESPONSE EXAMPLES

**New project (empty):** "I'll bootstrap a Next.js project with..." → then use write_file for each required file → then "Your project is ready with these files: ..."

**Editing existing code:** "I see the navbar needs updating. Let me read it first..." → view_file → "I'll change the color..." → line_replace → "Updated the navbar to use the new color tokens."

**Fixing errors:** "Let me search for where this error occurs..." → search_files → "Found the issue in..." → line_replace → "Fixed. The error was..."`;

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      ...history,
      { role: 'user', content: prompt },
    ];

    // 5. Call AI API with streaming
    if (!aiApiKey) {
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
        metadata: { model: aiModel, credits: creditsToSpend },
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

    // Route to correct provider based on intent detection
    const providerBaseUrl = useGroq ? groqBaseUrl : aiBaseUrl;
    const providerApiKey = useGroq ? groqApiKey : aiApiKey;

    const aiResponse = await fetch(`${providerBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: aiModel,
        messages: aiMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 16384,
      }),
      // Deno Edge Functions have ~150s wall clock.
      // 120s gives time for large generations before the container timeout.
      signal: AbortSignal.timeout(120_000),
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
            const chatText = extractPlainChatText(finalText);
            await supabase.from('thread_messages').insert({
              thread_id: threadId,
              user_id: user.id,
              role: 'assistant',
              content: chatText || 'Generated files → code pane',
              model: aiModel,
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
              model: aiModel,
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
              details: { source: 'generate', credits: creditsToSpend, model: aiModel },
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
