/**
 * Agent Turn API — Tool-calling loop with SSE streaming.
 *
 * P9: Project memory (project_memory.md persisted per project)
 * P10: File-context auto-injection (scan prompt for file mentions)
 * P11: Parallel tool calls (execute reads concurrently)
 * P12: Token-budget aware truncation
 * P13: Prompt injection defense
 *
 * Runtime: nodejs — maxDuration 300s
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { checkRateLimit } from '@/lib/server/plan-enforcement';
import { AGENT_TOOLS, executeToolCall, type ToolCall, type ToolResult, type ProjectContext } from '@/lib/agent/tools';
import { pickModel, detectIntent, type ProviderConfigs } from '@/lib/ai/router';
import { getRelevantSkills } from '@/lib/agent/skills-retrieval';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_TOOL_TURNS = 25;
const MAX_HISTORY_TOKENS = 12000; // ~12K tokens for history (leaves ~4K for response)
const CONVERSATION_LIMIT = 30;     // Max messages to load

// ── P13: Prompt injection sanitization ───────────────────────────────────
// Strip potential injection payloads from file content before feeding to LLM.
function sanitizeFileContent(content: string): string {
  return content
    .replace(/<system[^>]*>[\s\S]*?<\/system>/gi, '')
    .replace(/<instruction[^>]*>[\s\S]*?<\/instruction>/gi, '')
    .replace(/ignore (all |)previous (instructions|prompt)/gi, '[filtered]')
    .replace(/dump\s+(env|environment|secrets)/gi, '[filtered]');
}

// ── P12: Token-budget truncation ──────────────────────────────────────────
// Estimate tokens (4 chars ≈ 1 token for English text). Keep system msg + last user turn.
function truncateHistory(
  history: Array<{ role: string; content: string }>,
  maxTokens: number,
): Array<{ role: string; content: string }> {
  let total = 0;
  const kept: Array<{ role: string; content: string }> = [];

  // Always keep the most recent messages first (reverse iteration)
  for (let i = history.length - 1; i >= 0; i--) {
    const msg = history[i]!;
    const estTokens = Math.ceil(msg.content.length / 4);
    if (total + estTokens > maxTokens && kept.length > 3) break; // Keep at least last 3
    total += estTokens;
    kept.unshift(msg); // Re-insert at beginning to preserve order
  }

  return kept;
}

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

  const { projectId, prompt } = body;
  const intent = detectIntent(prompt);

  // ── Load provider configs ──────────────────────────────────────────────
  const configs: ProviderConfigs = { groq: null, deepseek: null };
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) configs.groq = { apiKey: groqKey, baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1' };
  const dsKey = process.env.AI_API_KEY;
  if (dsKey) configs.deepseek = { apiKey: dsKey, baseUrl: process.env.AI_BASE_URL || 'https://api.deepseek.com/v1' };

  const primary = pickModel(intent, configs);
  if (!primary) {
    return NextResponse.json({ error: 'No AI provider configured' }, { status: 500 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  // ── Load project context ───────────────────────────────────────────────
  const projectFiles: Record<string, string> = {};
  let projectMemory = '';

  if (projectId && serviceKey) {
    try {
      const admin = createClient(supabaseUrl, serviceKey);

      // Load file tree
      const { data: fileRows } = await admin
        .from('project_files')
        .select('path, content')
        .eq('project_id', projectId);
      for (const row of (fileRows || [])) {
        if (row.path && row.content !== undefined) {
          projectFiles[row.path] = sanitizeFileContent(row.content);
        }
      }

      // P9: Load project memory
      const { data: memoryRow } = await admin
        .from('project_files')
        .select('content')
        .eq('project_id', projectId)
        .eq('path', 'project_memory.md')
        .maybeSingle();
      if (memoryRow?.content) {
        projectMemory = memoryRow.content;
      }
    } catch { /* no project_files table yet */ }
  }

  // ── P12: Load conversation history with token budget ────────────────────
  const rawHistory: Array<{ role: string; content: string }> = [];
  if (projectId) {
    try {
      const admin = createClient(supabaseUrl, serviceKey || process.env.SUPABASE_ANON_KEY!);
      const { data: msgs } = await admin
        .from('thread_messages')
        .select('role, content')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(CONVERSATION_LIMIT);

      if (msgs) {
        rawHistory.push(
          ...msgs.reverse().map((m: { role: string; content: string }) => ({
            role: m.role,
            content: m.content,
          })),
        );
      }
    } catch { /* no thread_messages access */ }
  }

  const history = truncateHistory(rawHistory, MAX_HISTORY_TOKENS);

  // ── Build project context ──────────────────────────────────────────────
  const ctx: ProjectContext = {
    projectId: projectId || '',
    files: projectFiles,
    onFileChange: projectId && serviceKey ? async (path, content) => {
      try {
        const admin = createClient(supabaseUrl, serviceKey);
        await admin.from('project_files').upsert({
          project_id: projectId, path, content, status: 'modified',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'project_id,path' });

        // P9: Also update project_memory.md if the agent touches it
        if (path === 'project_memory.md') {
          projectMemory = content;
        }
      } catch { }
    } : undefined,
    onReadDevLogs: projectId ? async (filter, lines = 50) => {
      try {
        const sandboxBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const res = await fetch(`${sandboxBase}/api/sandbox/status?projectId=${projectId}`, {
          headers: serviceKey ? { Authorization: `Bearer ${serviceKey}` } : {},
        });
        if (!res.ok) throw new Error('Sandbox not running');
        const { sandboxId } = await res.json().catch(() => ({}));
        if (!sandboxId) return 'No sandbox is running.';

        const logRes = await fetch(`${sandboxBase}/api/sandbox/${sandboxId}/logs`, {
          headers: serviceKey ? { Authorization: `Bearer ${serviceKey}` } : {},
        });
        if (!logRes.ok) return 'Could not read sandbox logs.';
        const text = await logRes.text();
        const allLines = text.split('\n').filter(Boolean).slice(-lines);
        if (filter) {
          const f = filter.toLowerCase();
          return allLines.filter(l => l.toLowerCase().includes(f)).join('\n') || 'No matching logs';
        }
        return allLines.join('\n') || 'No recent log output.';
      } catch { return 'Dev server logs not available.'; }
    } : undefined,
    onWebSearch: async (query) => {
      try {
        const tavilyKey = process.env.TAVILY_API_KEY;
        if (!tavilyKey) return `Web search not configured. Check docs for "${query}".`;
        const res = await fetch('https://api.tavily.com/search', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ api_key: tavilyKey, query, search_depth: 'basic', max_results: 3 }),
        });
        if (!res.ok) throw new Error('Search failed');
        const data = await res.json();
        const results = (data?.results || []) as Array<{ title: string; url: string; content: string }>;
        if (!results.length) return `No results for "${query}"`;
        return results.map(r => `**${r.title}**\n${r.url}\n${r.content?.slice(0, 500)}`).join('\n\n');
      } catch { return `Search failed for "${query}".`; }
    },
  };

  // ── P10: Auto-inject file context ───────────────────────────────────────
  // Scan the user prompt for file mentions (path/to/file.ext) and auto-attach
  // their content so the LLM has full context without needing view_file first.
  const fileMentions = prompt.match(/[\w./-]+\.[a-zA-Z0-9]{2,6}/g) || [];
  const uniqueMentions = [...new Set(fileMentions)].filter(f => projectFiles[f]);
  let fileContext = '';
  if (uniqueMentions.length > 0) {
    fileContext = '\n\n## Relevant file contents (auto-attached)\n\n' +
      uniqueMentions.map(f => {
        const content = projectFiles[f]!;
        const lines = content.split('\n');
        const preview = lines.length > 40
          ? lines.slice(0, 40).join('\n') + `\n... (${lines.length - 40} more lines, use view_file to read)`
          : content;
        return `### ${f}\n\`\`\`\n${preview}\n\`\`\``;
      }).join('\n\n');
  }

  // ── Stream the agent loop as SSE ───────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: string) => { try { controller.enqueue(encoder.encode(data)); } catch {} };
      let cancelled = false;
      const heartbeat = setInterval(() => { if (!cancelled) enqueue(ssePing()); }, 15_000);

      try {
        const skillContext = getRelevantSkills(prompt, 2, 600);

        const memoryBlock = projectMemory
          ? `\n\n## Project Memory\n\`\`\`\n${projectMemory.slice(0, 2000)}\n\`\`\`\n(Keep project_memory.md updated with key decisions, stack, tokens, and patterns)`
          : '';

        const messages: Array<{ role: string; content: string }> = [
          {
            role: 'system',
            content: `You are DeBuggAI, an expert Next.js engineer. Use tools to explore, read, and edit files surgically.

## WORKFLOW
1. **Explore** → use list_dir
2. **Read** → use view_file before editing
3. **Edit** → line_replace (preferred) or write_file (new files)
4. **Verify** → read_dev_logs after changes
5. **Research** → web_search for up-to-date docs

## DESIGN RULES
- Edit globals.css CSS variables for theme colors (--primary, --foreground, etc.)
- NEVER use raw hex (#xxx) in JSX — use Tailwind semantic classes
- Use @/ import alias for local imports
- Keep edits SMALL — one logical change per turn

## BOOTSTRAP (empty project)
Required files: package.json, tsconfig.json, next.config.js, app/layout.tsx, app/page.tsx, app/globals.css, tailwind.config.ts, postcss.config.mjs

Current files: ${Object.keys(ctx.files).length > 0 ? Object.keys(ctx.files).join(', ') : '(empty)'}${memoryBlock}${skillContext}${fileContext}`,
          },
          ...history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: prompt },
        ];

        // ── Tool-calling loop ────────────────────────────────────────────
        let turnCount = 0;

        while (turnCount < MAX_TOOL_TURNS && !cancelled) {
          turnCount++;

          const res = await fetch(`${primary.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${primary.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: primary.model, messages, tools: AGENT_TOOLS,
              tool_choice: 'auto', stream: false,
              max_tokens: primary.maxTokens, temperature: 0.3,
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

          // ── P11: Tool calls — execute reads in parallel ────────────────
          if (finishReason === 'tool_calls' || choice?.message?.tool_calls?.length) {
            const toolCalls: Array<{ id: string; function: { name: string; arguments: string } }> =
              choice.message.tool_calls;

            // Separate reads (safe to parallelize) from writes (must be sequential)
            const reads: typeof toolCalls = [];
            const writes: typeof toolCalls = [];

            for (const tc of toolCalls) {
              const name = tc.function.name;
              if (name === 'view_file' || name === 'list_dir' || name === 'search_files') {
                reads.push(tc);
              } else {
                writes.push(tc);
              }
            }

            // Execute reads in parallel
            const readResults: Array<{ tc: typeof toolCalls[0]; result: ToolResult }> = [];
            if (reads.length > 0) {
              const parallel = await Promise.all(
                reads.map(async (tc) => {
                  const args = (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })();
                  enqueue(sseEvent('tool_call', { id: tc.id, name: tc.function.name, args }));
                  const result = await executeToolCall({ id: tc.id, name: tc.function.name, args }, ctx);
                  enqueue(sseEvent('tool_result', result));
                  return { tc, result };
                }),
              );
              readResults.push(...parallel);
            }

            // Feed read results back first
            for (const { tc, result } of readResults) {
              messages.push({
                role: 'assistant', content: '',
                // @ts-expect-error tool_calls not in standard types
                tool_calls: [{ id: tc.id, type: 'function', function: tc.function }],
              });
              messages.push({
                role: 'tool', content: result.output,
                // @ts-expect-error tool_call_id not in standard types
                tool_call_id: tc.id,
              });
            }

            // Execute writes sequentially (safer for file consistency)
            for (const tc of writes) {
              const args = (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })();
              enqueue(sseEvent('tool_call', { id: tc.id, name: tc.function.name, args }));
              const result = await executeToolCall({ id: tc.id, name: tc.function.name, args }, ctx);
              enqueue(sseEvent('tool_result', result));

              messages.push({
                role: 'assistant', content: '',
                // @ts-expect-error tool_calls not in standard types
                tool_calls: [{ id: tc.id, type: 'function', function: tc.function }],
              });
              messages.push({
                role: 'tool', content: result.output,
                // @ts-expect-error tool_call_id not in standard types
                tool_call_id: tc.id,
              });
            }

            continue;
          }

          // ── Final message ─────────────────────────────────────────────
          const content = choice?.message?.content || '';
          if (content) {
            enqueue(sseEvent('message', { content }));
            messages.push({ role: 'assistant', content });
          }
          break;
        }

        enqueue('event: done\ndata: {}\n\n');
      } catch (err: unknown) {
        enqueue(sseEvent('error', { message: err instanceof Error ? err.message : String(err) }));
      } finally {
        clearInterval(heartbeat);
        try { controller.close(); } catch {}
      }
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
