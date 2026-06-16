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
import { checkIPRateLimit } from '@/lib/server/plan-enforcement';
import { AGENT_TOOLS, executeToolCall, type ToolResult, type ProjectContext } from '@/lib/agent/tools';
import { pickModel, detectIntent, type ProviderConfigs } from '@/lib/ai/router';
import { getRelevantSkills } from '@/lib/agent/skills-retrieval';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { extractVirtualFiles } from '@/lib/project/virtual-files';
import { formatUiQualityRules } from '@/lib/agent/ui-quality-rules';
import { sandboxManager } from '@/lib/sandbox/sandbox';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const MAX_TOOL_TURNS = 25;
const MAX_VERIFY_RETRIES = 3;
const MAX_HISTORY_TOKENS = 1200; // keep agent requests under free-tier Groq/DeepSeek limits
const CONVERSATION_LIMIT = 30;     // Max messages to load

const COMPACT_AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_dir',
      description: 'List project files.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'view_file',
      description: 'Read a project file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          startLine: { type: 'number' },
          endLine: { type: 'number' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Create or replace a file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'line_replace',
      description: 'Replace exact text in a file.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          old_text: { type: 'string' },
          new_text: { type: 'string' },
          first_line: { type: 'number' },
          last_line: { type: 'number' },
        },
        required: ['path', 'old_text', 'new_text', 'first_line', 'last_line'],
      },
    },
  },
];

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

function hasSubstantiveFiles(files: Record<string, string>): boolean {
  return Object.values(files).some((content) => content.trim().length > 0);
}

function mergeGenerationSnapshot(
  target: Record<string, string>,
  code: string | null | undefined,
) {
  if (!code?.trim()) return;
  const parsed = extractVirtualFiles(code);
  for (const file of Object.values(parsed.files)) {
    if (file.content.trim()) target[file.path] = sanitizeFileContent(file.content);
  }
}

function stripClientFileContext(prompt: string) {
  return prompt
    .replace(/\n--- CURRENT PROJECT FILES ---[\s\S]*?\n--- END PROJECT FILES ---\s*/g, '\n')
    .replace(/\nApply the changes above to the existing project\. Return complete file blocks[\s\S]*$/g, '')
    .trim();
}

function detectAgentIntent(prompt: string, generationDirective?: string) {
  const directive = generationDirective?.toLowerCase() || '';
  if (directive.includes('mode: resolve')) return 'debug' as const;
  if (
    directive.includes('mode: ux polish') ||
    directive.includes('mode: restructure') ||
    directive.includes('existing project files are already loaded')
  ) {
    return 'code_edit' as const;
  }
  return detectIntent(prompt);
}

function buildAgentSystemPrompt({
  provider,
  generationDirective,
  currentFiles,
  memoryBlock,
  skillContext,
  fileContext,
}: {
  provider: 'groq' | 'deepseek' | 'zai';
  generationDirective?: string;
  currentFiles: string[];
  memoryBlock: string;
  skillContext: string;
  fileContext: string;
}) {
  const fileList = currentFiles.length > 0 ? currentFiles.join(', ') : '(empty)';
  const uiQualityRules = formatUiQualityRules();
  if (provider === 'groq') {
    return [
      'You are DeBuggAI, an expert Next.js engineer. Use tools to make small, exact file edits.',
      'Rules: view_file before editing existing files; prefer line_replace; write_file for new files; return concise status.',
      'Design: use app/globals.css theme tokens and semantic Tailwind. Avoid raw hex in JSX.',
      `UI quality rules:\n${uiQualityRules}`,
      generationDirective ? `Directive:\n${generationDirective}` : '',
      `Current files: ${fileList}`,
      fileContext,
    ].filter(Boolean).join('\n\n');
  }

  return `You are DeBuggAI, an expert Next.js engineer. Use tools to explore, read, and edit files surgically.

## WORKFLOW
1. **Explore** → use list_dir
2. **Read** → use view_file before editing
3. **Edit** → line_replace (preferred) or write_file (new files)
4. **Verify** → read_dev_logs after changes
5. **Research** → web_search for up-to-date docs

## EXISTING PROJECT RULES
- If current files are present, treat the request as an edit to those files.
- For refactor, polish, or fix requests, you MUST change at least one file unless the request is impossible.
- Prefer targeted line_replace edits. Do not rebuild the whole app unless the user explicitly asks.
- If polishing UI, inspect app/globals.css plus the visible page/component files, then update CSS tokens/components.
- If refactoring, preserve behavior and routes; move code only when it improves boundaries.
- Finish by returning the changed files through tool writes, not by describing what the user should do.

## DESIGN RULES
- Edit globals.css CSS variables for theme colors (--primary, --foreground, etc.)
- NEVER use raw hex (#xxx) in JSX — use Tailwind semantic classes
- Use @/ import alias for local imports
- Keep edits SMALL — one logical change per turn
- Use shadcn/ui components — import from @/components/ui/<name> for UI elements (Button, Card, Input, Textarea, Badge, Tabs, Dialog, Select, Avatar, etc.). For missing components, use base Tailwind.
- If generated code imports a package, package.json must include it. For shadcn/ui primitives this commonly includes @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge, and lucide-react.
- If postcss.config uses tailwindcss and autoprefixer, package.json devDependencies must include tailwindcss, postcss, and autoprefixer. If it uses @tailwindcss/postcss, include @tailwindcss/postcss and tailwindcss.

## PREVIEW LIMITATIONS
- The preview uses Tailwind CSS Play CDN v3 — all standard utility classes work (flex, grid, colors, spacing, typography) but DO NOT rely on advanced Tailwind v4 features. Use standard v3 class names.
- shadcn/ui components render as basic HTML elements inside the preview. Their shadcn-specific sub-components (SheetContent, DialogTrigger, etc.) are placeholder divs. Structure the page layout with standard Tailwind classes instead of relying on complex shadcn dialog/sheet behavior.
- 'className' props ARE passed through to the HTML elements. Use standard Tailwind classes like bg-primary, text-lg, rounded-lg, p-4, flex, gap-2, etc. — these all work.
- The preview renders without allow-same-origin (localStorage is shimmed in memory). Do not rely on localStorage persisting across refreshes.
- CSS custom properties (--primary, --muted, etc.) are set in globals.css and mapped to Tailwind theme colors. Use semantic Tailwind classes (bg-primary, text-muted-foreground, border-border) rather than inline styles.

## UI QUALITY RULES
${uiQualityRules}

## BOOTSTRAP (empty project)
Required files: package.json, tsconfig.json, next.config.js, app/layout.tsx, app/page.tsx, app/globals.css, tailwind.config.ts, postcss.config.mjs
When the project is empty, you MUST create files using write_file. Do not answer conversationally without writing code.
Create a real multi-file project: app/page.tsx should stay thin and compose imported UI; place reusable UI in components/, stateful feature logic in hooks/, pure helpers/constants/data in lib/, and shared interfaces in types/.
For a new UI app, create at least one meaningful component file and one hook/lib/type file in addition to the required app files. Avoid putting the full application in app/page.tsx unless explicitly asked for a single-file demo.
${generationDirective ? `\n## User Generation Directive\n${generationDirective}\n` : ''}

Current files: ${fileList}${memoryBlock}${skillContext}${fileContext}`;
}

async function loadThreadHistory(
  admin: SupabaseClient,
  params: { projectId?: string; threadId?: string },
): Promise<Array<{ role: string; content: string }>> {
  const normalize = (rows: unknown) => {
    if (!Array.isArray(rows)) return [];
    return rows
      .reverse()
      .map((m) => {
        const row = m as { role?: unknown; content?: unknown };
        return {
          role: String(row.role || 'user'),
          content: String(row.content || ''),
        };
      })
      .filter((m) => m.content.trim().length > 0);
  };

  if (params.threadId) {
    const byThread = await admin
      .from('thread_messages')
      .select('role, content')
      .eq('thread_id', params.threadId)
      .order('created_at', { ascending: false })
      .limit(CONVERSATION_LIMIT);

    if (!byThread.error) return normalize(byThread.data);
    if (!/thread_id/i.test(byThread.error.message)) return [];
  }

  if (!params.projectId) return [];

  const direct = await admin
    .from('thread_messages')
    .select('role, content')
    .eq('project_id', params.projectId)
    .order('created_at', { ascending: false })
    .limit(CONVERSATION_LIMIT);

  if (!direct.error) return normalize(direct.data);
  if (!/project_id/i.test(direct.error.message)) return [];

  const { data: threads } = await admin
    .from('threads')
    .select('id')
    .eq('project_id', params.projectId)
    .limit(20);

  const threadIds = (threads || [])
    .map((thread: { id?: unknown }) => String(thread.id || ''))
    .filter(Boolean);

  if (threadIds.length === 0) return [];

  const fallback = await admin
    .from('thread_messages')
    .select('role, content')
    .in('thread_id', threadIds)
    .order('created_at', { ascending: false })
    .limit(CONVERSATION_LIMIT);

  if (fallback.error) return [];
  return normalize(fallback.data);
}

// ── POST ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Per-IP rate limit — catches anonymous abuse before auth
  const ipCheck = await checkIPRateLimit(req);
  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: 'Too many requests from this IP' },
      { status: 429, headers: { 'Retry-After': String(ipCheck.retryAfter || 60) } },
    );
  }

  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = (await req.json().catch(() => null)) as {
    projectId?: string;
    threadId?: string;
    prompt?: string;
    history?: Array<{ role: string; content: string }>;
    generationDirective?: string;
  } | null;

  if (!body?.prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  const { projectId, threadId, generationDirective } = body;
  const prompt = stripClientFileContext(body.prompt);
  const intent = detectAgentIntent(prompt, generationDirective);

  // ── Load provider configs ──────────────────────────────────────────────
  const configs: ProviderConfigs = { zai: null, groq: null, deepseek: null };
  const zaiKey = process.env.ZAI_API_KEY;
  if (zaiKey) {
    configs.zai = {
      apiKey: zaiKey,
      baseUrl: (process.env.ZAI_BASE_URL || 'https://api.z.ai/api/coding/paas/v4').trim(),
      model: process.env.ZAI_MODEL?.trim() || 'GLM-4.6',
    };
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    configs.groq = {
      apiKey: groqKey,
      baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL?.trim() || null,
    };
  }

  const explicitDeepseekKey = process.env.DEEPSEEK_API_KEY;
  if (explicitDeepseekKey) {
    configs.deepseek = {
      apiKey: explicitDeepseekKey,
      baseUrl: (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1').trim(),
      model: process.env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat',
    };
  }

  const dsKey = process.env.AI_API_KEY;
  if (dsKey) {
    const baseUrl = (process.env.AI_BASE_URL || 'https://api.deepseek.com/v1').trim();
    const model = process.env.AI_MODEL?.trim() || null;
    if (/api\.z\.ai/i.test(baseUrl)) {
      configs.zai = { apiKey: dsKey, baseUrl, model: model || 'GLM-4.6' };
    } else if (/groq\.com/i.test(baseUrl)) {
      configs.groq = { apiKey: dsKey, baseUrl, model };
    } else if (!configs.deepseek) {
      configs.deepseek = { apiKey: dsKey, baseUrl, model };
    }
  }

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

    if (!hasSubstantiveFiles(projectFiles)) {
      try {
        const admin = createClient(supabaseUrl, serviceKey);
        const { data: generationRow } = await admin
          .from('generations')
          .select('code')
          .eq('project_id', projectId)
          .not('code', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        mergeGenerationSnapshot(projectFiles, generationRow?.code);
      } catch { /* generations may be unavailable */ }
    }
  }

  // ── P12: Load conversation history with token budget ────────────────────
  const rawHistory: Array<{ role: string; content: string }> = [];
  if (projectId) {
    try {
      const admin = createClient(supabaseUrl, serviceKey || process.env.SUPABASE_ANON_KEY!);
      rawHistory.push(...await loadThreadHistory(admin, { projectId, threadId }));
    } catch { /* no thread_messages access */ }
  } else if (threadId) {
    try {
      const admin = createClient(supabaseUrl, serviceKey || process.env.SUPABASE_ANON_KEY!);
      rawHistory.push(...await loadThreadHistory(admin, { threadId }));
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
        const sandbox = await sandboxManager.findByProjectId(projectId);
        if (!sandbox) return 'No sandbox is running for this project.';
        const { lines: logLines, isRunning } = await sandboxManager.getLogs(sandbox.id);
        const recent = logLines.slice(-lines);
        const statusTag = isRunning ? '' : ' [sandbox stopped]';
        if (filter) {
          const f = filter.toLowerCase();
          const filtered = recent.filter(l => l.toLowerCase().includes(f));
          return (filtered.join('\n') || 'No matching logs') + statusTag;
        }
        return (recent.join('\n') || 'No recent log output.') + statusTag;
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
    onReadNetworkRequests: projectId ? async (filter, statusCode) => {
      try {
        const sandbox = await sandboxManager.findByProjectId(projectId);
        if (!sandbox) return 'No sandbox is running for this project.';
        const { lines: logLines } = await sandboxManager.getLogs(sandbox.id);
        let httpErrors = logLines.filter(l =>
          l.includes('GET http') || l.includes('POST http') ||
          l.includes('fetch failed') || l.includes('ECONNREFUSED') ||
          l.includes('ENOTFOUND') || l.includes('CORS')
        );
        if (filter) {
          httpErrors = httpErrors.filter(l => l.toLowerCase().includes(filter.toLowerCase()));
        }
        if (statusCode) {
          httpErrors = httpErrors.filter(l => l.includes(` ${statusCode} `) || l.includes(` ${statusCode}\n`));
        }
        const recent = httpErrors.slice(-10);
        if (!recent.length) return 'No HTTP request errors detected. The app appears to be making successful requests.';
        return recent.join('\n');
      } catch {
        return 'Network request inspection not available.';
      }
    } : undefined,
    onGenerateImage: async (prompt, path, style) => {
      try {
        const replicateToken = process.env.REPLICATE_API_TOKEN;
        const togetherKey = process.env.TOGETHER_API_KEY;
        const apiKey = replicateToken || togetherKey;
        if (!apiKey) return 'Image generation not configured. Set REPLICATE_API_TOKEN or TOGETHER_API_KEY.';

        if (togetherKey) {
          // Together AI — FLUX model
          const fullPrompt = style
            ? `${prompt} — ${style} style, high quality, professional, clean design`
            : `${prompt} — high quality, professional, clean design`;

          const res = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${togetherKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'black-forest-labs/FLUX.1-schnell',
              prompt: fullPrompt,
              width: 1024, height: 768, steps: 4,
            }),
            signal: AbortSignal.timeout(30_000),
          });
          if (!res.ok) throw new Error(`Together API: ${res.status}`);
          const data = await res.json();
          const imageUrl = data?.data?.[0]?.url;
          if (!imageUrl) throw new Error('No image URL in response');

          // Download and save to project_files
          const imgRes = await fetch(imageUrl);
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          const admin = createClient(supabaseUrl, serviceKey);

          // Store the image as base64 in project_files (small enough for icons)
          const base64 = buffer.toString('base64');
          if (projectId) {
            await admin.from('project_files').upsert({
              project_id: projectId, path, content: base64,
              status: 'modified', updated_at: new Date().toISOString(),
            }, { onConflict: 'project_id,path' });
          }
          return `Image generated and saved to ${path}. Size: ${Math.round(buffer.length / 1024)}KB.`;
        }
        return 'Image generation via Replicate not yet implemented. Set TOGETHER_API_KEY for FLUX.1-schnell.';
      } catch (err) {
        return `Image generation failed: ${err instanceof Error ? err.message : String(err)}`;
      }
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
      const cancelled = false;
      const heartbeat = setInterval(() => { if (!cancelled) enqueue(ssePing()); }, 15_000);

      try {
        const skillContext = primary.provider === 'groq' ? '' : getRelevantSkills(prompt, 2, 600);

        const memoryBlock = projectMemory
          ? `\n\n## Project Memory\n\`\`\`\n${projectMemory.slice(0, primary.provider === 'groq' ? 500 : 2000)}\n\`\`\`\n(Keep project_memory.md updated with key decisions, stack, tokens, and patterns)`
          : '';

        const messages: Array<{ role: string; content: string }> = [
          {
            role: 'system',
            content: buildAgentSystemPrompt({
              provider: primary.provider,
              generationDirective,
              currentFiles: Object.keys(ctx.files),
              memoryBlock,
              skillContext,
              fileContext,
            }),
          },
          ...history.map(h => ({ role: h.role, content: h.content })),
          { role: 'user', content: prompt },
        ];

        // ── Tool-calling loop ────────────────────────────────────────────
        let turnCount = 0;
        let verifyRetries = 0;

        while (turnCount < MAX_TOOL_TURNS && !cancelled) {
          turnCount++;

          const res = await fetch(`${primary.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${primary.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: primary.model,
              messages,
              tools: primary.provider === 'groq' ? COMPACT_AGENT_TOOLS : AGENT_TOOLS,
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

            // ── Auto-verify: check sandbox logs for errors after writes ────
            if (writes.length > 0 && projectId && verifyRetries < MAX_VERIFY_RETRIES) {
              const sandbox = await sandboxManager.findByProjectId(projectId);
              if (sandbox) {
                const { lines: logLines } = await sandboxManager.getLogs(sandbox.id);
                const recent = logLines.slice(-80);
                const errorPatterns = [
                  /error/i, /failed/i, /cannot find module/i,
                  /unexpected token/i, /ecacc/i, /eisdir/i,
                  /build fail/i, /compilation fail/i,
                ];
                const errors = recent.filter(line =>
                  errorPatterns.some(p => p.test(line))
                );
                if (errors.length > 0) {
                  verifyRetries++;
                  enqueue(sseEvent('verify', { attempt: verifyRetries, errors: errors.slice(-15) }));
                  // Inject error log as tool result so the model can fix issues
                  messages.push({
                    role: 'tool', content: `Sandbox errors after latest changes:\n${errors.join('\n')}\n\nFix these errors.`,
                    // @ts-expect-error
                    tool_call_id: 'verify',
                  });
                  messages.push({
                    role: 'user', content: 'The dev server reported errors after your changes. Read dev_logs for details, then fix each error.',
                  });
                  continue;
                }
              }
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

        const changedFiles = Object.fromEntries(
          Object.entries(ctx.files).filter(([, content]) => content.trim().length > 0),
        );
        if (Object.keys(changedFiles).length > 0) {
          enqueue(sseEvent('files', { files: changedFiles }));
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
