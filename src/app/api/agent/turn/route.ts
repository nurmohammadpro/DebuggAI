/**
 * Agent Turn API — Tool-calling loop with SSE streaming.
 *
 * Each POST runs a multi-turn agent loop:
 *   user msg → LLM picks tools → execute → feed results → repeat
 *
 * Streams tool_call/tool_result/message events as SSE so the
 * chat panel can render a live diff timeline.
 *
 * Runtime: nodejs (not edge) — needs long-lived execution.
 * maxDuration: 300s to accommodate multi-turn loops.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { AGENT_TOOLS, executeToolCall, type ToolCall, type ToolResult, type ProjectContext } from '@/lib/agent/tools';
import { pickModel, detectIntent, type ProviderConfigs } from '@/lib/ai/router';
import { getRelevantSkills } from '@/lib/agent/skills-retrieval';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for multi-turn loops

const MAX_TOOL_TURNS = 25;

// ── SSE helpers ──────────────────────────────────────────────────────────
function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function ssePing(): string {
  return ': ping\n\n';
}

// ── POST ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = (await req.json().catch(() => null)) as {
    projectId?: string;
    prompt?: string;
    history?: Array<{ role: string; content: string }>;
  } | null;

  if (!body?.prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const { projectId, prompt, history = [] } = body;
  const intent = detectIntent(prompt);

  // ── Load provider configs ────────────────────────────────────────────
  const configs: ProviderConfigs = { groq: null, deepseek: null };

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    configs.groq = {
      apiKey: groqKey,
      baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    };
  }

  const dsKey = process.env.AI_API_KEY;
  if (dsKey) {
    configs.deepseek = {
      apiKey: dsKey,
      baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1',
    };
  }

  const primary = pickModel(intent, configs);
  if (!primary) {
    return NextResponse.json(
      { error: 'No AI provider configured. Set GROQ_API_KEY or AI_API_KEY.' },
      { status: 500 },
    );
  }

  // ── Load project files into in-memory context ──────────────────────────
  const projectFiles: Record<string, string> = {};
  if (projectId) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: rows } = await admin
        .from('project_files')
        .select('path, content')
        .eq('project_id', projectId);

      for (const row of (rows || [])) {
        if (row.path && row.content !== undefined) {
          projectFiles[row.path] = row.content;
        }
      }
    } catch {
      // No project_files table yet — agent works with empty context initially
    }
  }

  // ── Build project context ──────────────────────────────────────────────
  const ctx: ProjectContext = {
    projectId: projectId || '',
    files: projectFiles,
    onFileChange: projectId
      ? async (path, content) => {
          try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
            const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
            const admin = createClient(supabaseUrl, serviceKey);
            await admin.from('project_files').upsert({
              project_id: projectId,
              path,
              content,
              status: 'modified',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'project_id,path' });
          } catch {
            // best-effort persistence
          }
        }
      : undefined,
    // Read sandbox dev logs (if sandbox is running)
    onReadDevLogs: projectId
      ? async (filter, lines = 50) => {
          try {
            // Check sandbox state from the sandbox manager
            const sandboxBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
            const res = await fetch(`${sandboxBase}/api/sandbox/status?projectId=${projectId}`, {
              headers: svcKey ? { Authorization: `Bearer ${svcKey}` } : {},
            });
            if (!res.ok) throw new Error('Sandbox not running');
            const { sandboxId } = await res.json().catch(() => ({}));
            if (!sandboxId) return 'No sandbox is running for this project. Start the dev server first.';

            const logRes = await fetch(`${sandboxBase}/api/sandbox/${sandboxId}/logs`, {
              headers: svcKey ? { Authorization: `Bearer ${svcKey}` } : {},
            });
            if (!logRes.ok) return 'Could not read sandbox logs.';
            const text = await logRes.text();
            const allLines = text.split('\n').filter(Boolean);
            const selected = allLines.slice(-lines);
            if (filter) {
              const fLower = filter.toLowerCase();
              return selected.filter(l => l.toLowerCase().includes(fLower)).join('\n') || `No log lines matching "${filter}"`;
            }
            return selected.join('\n') || 'No recent log output.';
          } catch {
            return 'Dev server logs not available. Check the browser console for runtime errors.';
          }
        }
      : undefined,
    // Web search (Tavily or fallback)
    onWebSearch: async (query) => {
      try {
        const tavilyKey = process.env.TAVILY_API_KEY;
        if (!tavilyKey) {
          return `Web search not configured. Check these resources for "${query}": https://nextjs.org/docs, https://tailwindcss.com/docs, https://react.dev`;
        }
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: tavilyKey, query, search_depth: 'basic', max_results: 3 }),
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const results = (data?.results || []) as Array<{ title: string; url: string; content: string }>;
        if (!results.length) return `No results found for "${query}"`;
        return results.map(r => `**${r.title}**\n${r.url}\n${r.content?.slice(0, 500)}`).join('\n\n');
      } catch {
        return `Search for "${query}" failed. Try checking: https://nextjs.org/docs, https://tailwindcss.com/docs, https://react.dev`;
      }
    },
  };

  // ── Stream the agent loop as SSE ───────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: string) => {
        try { controller.enqueue(encoder.encode(data)); } catch { /* closed */ }
      };

      let cancelled = false;

      // Heartbeat every 15s
      const heartbeat = setInterval(() => {
        if (!cancelled) enqueue(ssePing());
      }, 15_000);

      try {
        // ── Build conversation ──────────────────────────────────────────
        const skillContext = getRelevantSkills(prompt, 2, 600);

        const messages: Array<{ role: string; content: string }> = [
          {
            role: 'system',
            content: `You are DeBuggAI, an expert Next.js engineer. You have access to tools for reading and writing project files.

## HOW YOU WORK
1. **Explore first** — use list_dir to see what exists
2. **Read before editing** — use view_file to inspect code
3. **Edit surgically** — line_replace for small changes (preferred), write_file for new files
4. **Search** — use search_files to find patterns
5. **Verify** — after changes, use read_dev_logs to check the dev server output
6. **Research** — use web_search when you need up-to-date API docs

## DESIGN TOKEN RULES (CRITICAL)
- Edit \`globals.css\` CSS variables for theme colors (--primary, --background, --foreground, --accent, --muted, --border)
- NEVER use raw hex colors (#xxx) in JSX/TSX files — always use Tailwind classes or CSS variables
- When the user asks to change a color, edit the CSS variable, not every component
- Use Tailwind utility classes, not inline styles
- Components should use semantic Tailwind classes (bg-primary, text-foreground, border-border)

## RULES
- Keep edits SMALL — one logical change per turn
- After making changes, explain what you did in 1-2 sentences
- If the project is empty, bootstrap required files (package.json, tsconfig.json, next.config.js, app/layout.tsx, app/page.tsx, app/globals.css, tailwind.config.ts, postcss.config.mjs)
- Use @/ import alias for local imports
- Before adding new dependencies, ask the user

Current project files: ${Object.keys(ctx.files).length > 0 ? Object.keys(ctx.files).join(', ') : '(empty)'}${skillContext}`,
          },
          ...history.map((h) => ({ role: h.role, content: h.content })),
          { role: 'user', content: prompt },
        ];

        // ── Tool-calling loop ───────────────────────────────────────────
        let turnCount = 0;

        while (turnCount < MAX_TOOL_TURNS && !cancelled) {
          turnCount++;

          const res = await fetch(`${primary.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${primary.apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: primary.model,
              messages,
              tools: AGENT_TOOLS,
              tool_choice: 'auto',
              stream: false,
              max_tokens: primary.maxTokens,
              temperature: 0.3,
            }),
            signal: AbortSignal.timeout(120_000),
          });

          if (!res.ok) {
            const err = await res.text().catch(() => 'Unknown error');
            enqueue(sseEvent('error', { message: `AI API error (${res.status}): ${err}` }));
            break;
          }

          const completion = await res.json();
          const choice = completion.choices?.[0];
          const finishReason = choice?.finish_reason;

          // ── Tool calls requested ─────────────────────────────────────
          if (finishReason === 'tool_calls' || choice?.message?.tool_calls?.length) {
            const toolCalls: Array<{
              id: string;
              function: { name: string; arguments: string };
            }> = choice.message.tool_calls;

            for (const tc of toolCalls) {
              const parsedArgs = (() => {
                try { return JSON.parse(tc.function.arguments || '{}'); }
                catch { return {}; }
              })();

              const toolCall: ToolCall = {
                id: tc.id,
                name: tc.function.name,
                args: parsedArgs,
              };

              enqueue(sseEvent('tool_call', { id: tc.id, name: tc.function.name, args: parsedArgs }));

              const result = await executeToolCall(toolCall, ctx);
              enqueue(sseEvent('tool_result', result));

              // Feed back into conversation
              messages.push({
                role: 'assistant',
                content: '',
                // @ts-expect-error tool_calls is not in standard types
                tool_calls: [{ id: tc.id, type: 'function', function: tc.function }],
              });
              messages.push({
                role: 'tool',
                content: result.output,
                // @ts-expect-error tool_call_id is not in standard types
                tool_call_id: tc.id,
              });
            }

            continue; // Back to loop — LLM gets tool results next turn
          }

          // ── Final message (no tool calls) ────────────────────────────
          const content = choice?.message?.content || '';
          if (content) {
            enqueue(sseEvent('message', { content }));
            messages.push({ role: 'assistant', content });
          }

          break; // Loop ends when LLM gives final reply
        }

        enqueue('event: done\ndata: {}\n\n');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        enqueue(sseEvent('error', { message }));
      } finally {
        clearInterval(heartbeat);
        try { controller.close(); } catch { /* already closed */ }
      }
    },
    cancel() {
      // no-op — AbortSignal handles it
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx/Caddy buffering off
    },
  });
}
