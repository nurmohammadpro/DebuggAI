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
        const messages: Array<{ role: string; content: string }> = [
          {
            role: 'system',
            content: `You are DeBuggAI, an expert Next.js engineer. You have access to tools for reading and writing project files.

Guidelines:
- Use list_dir to explore the project structure.
- Use view_file to read files before editing them.
- Use line_replace for small edits (preferred — preserves surrounding code).
- Use write_file only for new files or when replacing the entire file.
- Use search_files to find where a symbol or pattern is used.
- After making changes, explain what you did in plain English.
- Keep edits small and focused. One logical change per turn.
- If the project is empty (no files), use write_file to bootstrap it with app/page.tsx, app/layout.tsx, app/globals.css, package.json, tsconfig.json.

Current project files: ${Object.keys(ctx.files).length > 0 ? Object.keys(ctx.files).join(', ') : '(empty)'}`,
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
