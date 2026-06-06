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

  const withoutGeneratedSummary = trimmed.replace(
    /^\s*(?:generated\s+\*\*\d+\s+files?\*\*.*|\d+\s+files?\s+generated\s*(?:→|->).*)$/gim,
    '',
  );

  const lines = withoutGeneratedSummary.split('\n');
  const out: string[] = [];
  for (const line of lines) {
    const isFileMarker = /^\s*\/\/\s*File:\s+[\w./-]+\.[a-zA-Z0-9]+\s*$/.test(line);
    const isFence = /^\s*```/.test(line);
    if (isFileMarker || isFence) break;
    out.push(line);
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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

    // 2. Parse request body before using prompt for provider routing.
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
        const cfg = await getCachedProviderConfig(supabaseAdmin);
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
    const systemPrompt = `You are DeBuggAI, an expert Next.js engineer working alongside the user. Your communication style should be conversational and clear — like a senior pair programmer thinking out loud.

## HOW YOU COMMUNICATE
- **Lead with narrative** — start each step by explaining what you're doing and why
- **Show your reasoning** — talk through your thought process naturally ("Let me check...", "I notice...", "The issue is...", "Here's what I'll change...")
- **Give status updates** — after each logical step, briefly say what you did and what you found
- **Code blocks support the narrative** — use code blocks to show relevant code changes, but frame them with plain-English explanation. Don't dump code as the entire response
- **Summarize at the end** — a quick recap of what changed and why
- **Never list generated files in chat** — the UI extracts files into the code pane. In chat, mention outcomes and next steps only.

## RESPONSE STRUCTURE
A typical response flows through these stages naturally:
1. **Plan** — "I'll start by checking the existing project structure." / "Let me look at the navbar to understand the layout before making changes."
2. **Explore** — "Looking at components/hero.tsx, I see the layout uses hardcoded padding. Let me adapt it to use theme tokens instead."
3. **Action** — State what you're changing and why, then show the code change in a code block
4. **Result** — "The hero now uses responsive padding through CSS variables. On mobile it'll collapse to half the desktop spacing."

You don't need to use every stage every time — let the response flow naturally based on what the task needs.

## HARD RULES
1. Use App Router only (app/ directory, NOT pages/)
2. TypeScript by default (.ts / .tsx)
3. Tailwind CSS for styling
4. Edit globals.css CSS variables for colors — never hardcode raw hex in JSX
5. Keep edits SMALL. One logical change per response. Don't rewrite the whole project.
6. If the project is empty and the user asks you to build something, bootstrap the required files (package.json, tsconfig.json, next.config.js, app/layout.tsx, app/page.tsx, app/globals.css, tailwind.config.ts, postcss.config.mjs)
7. Use @/ import alias for local imports
8. Before adding new dependencies, ask the user first
9. Always write production-grade code: typed props, accessible labels, responsive states, empty states, loading states, error states, stable keys, and reusable components.
10. For generated projects, output a short natural-language response first, then all files using exact file markers:
    // File: path/to/file.tsx
    \`\`\`tsx
    ...
    \`\`\`
11. Do not repeat the filename inside the code block. For example, package.json must start with "{" and never with "// package.json".
12. Do not put generated source code in the narrative section. Source code only belongs after file markers.
13. If generated code imports a package, package.json must include it. For shadcn/ui primitives this commonly includes @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge, and lucide-react.
14. If postcss.config uses tailwindcss and autoprefixer, package.json devDependencies must include tailwindcss, postcss, and autoprefixer. If it uses @tailwindcss/postcss, include @tailwindcss/postcss and tailwindcss.

## UI COMPONENT LIBRARY (shadcn/ui)

This project has shadcn/ui pre-installed. **Use these components** instead of raw HTML/Tailwind for any matching UI element. Import from "@/components/ui/<name>" and use "cn()" from "@/lib/utils" for conditional classes.

### Available Components
- **Button** — \`import { Button } from "@/components/ui/button"\`
  Variants: default, outline, ghost, secondary, destructive, link, green
  Sizes: default (h-[44px] px-6), sm (h-[34px] px-4 text-[13px]), lg, icon
- **Card** — \`import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"\`
- **Input** — \`import { Input } from "@/components/ui/input"\`
- **Textarea** — \`import { Textarea } from "@/components/ui/textarea"\`
- **Label** — \`import { Label } from "@/components/ui/label"\`
- **Badge** — \`import { Badge } from "@/components/ui/badge"\`
  Variants: default, green, red, amber, blue, purple, gray, outline
- **Dialog** — \`import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"\`
- **AlertDialog** — \`import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"\`
- **Avatar** — \`import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"\`
- **DropdownMenu** — full set from \`"@/components/ui/dropdown-menu"\`
- **Select** — \`import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"\`
- **Tabs** — \`import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"\`
- **Separator** — \`import { Separator } from "@/components/ui/separator"\`
- **ScrollArea** — \`import { ScrollArea } from "@/components/ui/scroll-area"\`

### For components NOT yet installed (checkbox, table, form, tooltip, skeleton, etc.)
Use base Tailwind CSS or suggest: \`npx shadcn@latest add <component>\`.

## EXAMPLES

**New project (empty):**
"I'll set up a fresh Next.js project with the essentials: configuration, app layout, global styles, and a first usable screen. I'll keep the structure easy to extend and make sure the generated files are ready for the editor pane."

package.json (Next.js 16 + React 19), tsconfig.json, next.config.js:
// File: package.json
\`\`\`json
{ "dependencies": { "next": "^16.2.7", "react": "^19.2.4", "react-dom": "^19.2.4", "@radix-ui/react-slot": "^1.2.4", "class-variance-authority": "^0.7.1", "clsx": "^2.1.1", "tailwind-merge": "^3.4.0", "lucide-react": "^0.552.0" }, "devDependencies": { "typescript": "^5.9.3", "@types/node": "^20.19.25", "@types/react": "^19.2.7", "@types/react-dom": "^19.2.3", "tailwindcss": "^3.4.18", "postcss": "^8.5.6", "autoprefixer": "^10.4.22" } }
\`\`\`

"Config layer is ready. Now I'll scaffold the app layout with Tailwind, theme tokens, and a responsive first screen."

app/layout.tsx, app/globals.css, tailwind.config.ts, postcss.config.mjs:
// File: app/layout.tsx
\`\`\`tsx
import './globals.css';
export default function RootLayout(...) { ... }
\`\`\`

"All set. The project files are ready in the editor pane. Start with app/page.tsx, then open the preview to verify the UI."

**Editing existing code:**
"Let me check the current navbar to understand its structure before making changes."

The navbar uses inline styles for the background. I'll switch it to use the theme's CSS variable so it adapts to light/dark mode automatically.

\`\`\`tsx
// components/navbar.tsx — changed background
<nav className="bg-[var(--app-surface)] ...">
\`\`\`

"Done. The navbar now uses CSS variable --app-surface instead of the hardcoded hex color, so it'll respond to theme changes."

**Fixing errors:**
"A 404 on the /pricing route... let me check the app directory structure to find the issue."

I see a pricing/ folder in the app directory but no page.tsx inside it — that's why Next.js returns 404 for that route. Let me add the missing page.

\`\`\`tsx
// app/pricing/page.tsx
export default function PricingPage() { ... }
\`\`\`

"Created app/pricing/page.tsx — the /pricing route should work now."`;

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
              content: chatText || 'I prepared the project files. You can review them in the editor pane.',
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
