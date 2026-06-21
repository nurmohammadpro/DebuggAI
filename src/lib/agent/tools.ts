/**
 * Agent Tools — JSON schemas + executors for the tool-calling loop.
 *
 * These tools mirror Lovable's approach: list_dir, view_file,
 * write_file, line_replace, exec, search_files.
 *
 * Executors operate against:
 * 1. project_files table (committed state → Supabase)
 * 2. Docker volume (runtime state → /api/sandbox)
 */

import { shouldIgnorePreviewPath } from '@/lib/project/virtual-files';

// ── Tool definitions (OpenAI-compatible JSON schemas) ────────────────────

export const AGENT_TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_dir',
      description: 'List files and directories at a given path. Returns array of {name, type, size}.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Directory path relative to project root, e.g. "src/" or "app/"' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'view_file',
      description: 'Read the contents of a file. Optionally specify startLine and endLine to read a partial range.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to project root' },
          startLine: { type: 'number', description: 'First line to read (1-indexed). Omit to read from beginning.' },
          endLine: { type: 'number', description: 'Last line to read (1-indexed). Omit to read to end.' },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'write_file',
      description: 'Create or overwrite a file with the given content. Creates parent directories if needed.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to project root' },
          content: { type: 'string', description: 'Complete file content' },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'line_replace',
      description: 'Replace a range of lines in a file. Specify the exact old text to replace and its line range for precision.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'File path relative to project root' },
          old_text: { type: 'string', description: 'Exact text to replace (must match file content)' },
          new_text: { type: 'string', description: 'Replacement text' },
          first_line: { type: 'number', description: 'First line number of the old text (1-indexed)' },
          last_line: { type: 'number', description: 'Last line number of the old text (1-indexed)' },
        },
        required: ['path', 'old_text', 'new_text', 'first_line', 'last_line'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'search_files',
      description: 'Search across all project files using a regex pattern. Returns matching file paths and line numbers.',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regular expression pattern to search for' },
          glob: { type: 'string', description: 'Optional glob pattern to filter files, e.g. "**/*.tsx"' },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_dev_logs',
      description: 'Read recent console output from the dev server (errors, warnings, build output). Use this to check if your changes compiled successfully or to diagnose runtime errors.',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Optional: filter logs to lines containing this text (e.g. "error" or "warn")' },
          lines: { type: 'number', description: 'Number of recent log lines to return (default 50)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'web_search',
      description: 'Search the web for documentation, API references, or solution patterns. Use when you need up-to-date information about a library, framework API, or error message.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query — be specific, e.g. "Next.js 14 metadata API" or "tailwindcss grid responsive classes"' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'read_network_requests',
      description: 'Inspect failed HTTP requests from the running app. Use this to diagnose API errors, CORS issues, or missing endpoints. Returns recent network error details.',
      parameters: {
        type: 'object',
        properties: {
          filter: { type: 'string', description: 'Optional: filter by URL pattern (e.g. "/api/users")' },
          statusCode: { type: 'number', description: 'Optional: show only requests with this status code' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'generate_image',
      description: 'Generate an image asset (hero, logo, icon, illustration) using AI. Saves to the project assets directory.',
      parameters: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'Image description, e.g. "modern SaaS hero illustration with blue gradient, abstract geometric shapes"' },
          path: { type: 'string', description: 'Where to save the image, e.g. "public/hero.png" or "public/logo.svg"' },
          style: { type: 'string', description: 'Optional style hint: "minimal", "gradient", "illustration", "abstract", "dark"' },
        },
        required: ['prompt', 'path'],
      },
    },
  },
];

// ── Tool executor types ──────────────────────────────────────────────────

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  tool_call_id: string;
  output: string;
  is_error?: boolean;
}

export interface ProjectContext {
  projectId: string;
  files: Record<string, string>; // path → content (in-memory snapshot)
  /** Callback to persist a file write to Supabase + disk */
  onFileChange?: (path: string, content: string) => Promise<void>;
  /** Sandbox ID for reading dev server logs */
  sandboxId?: string;
  /** Callback to read dev server logs */
  onReadDevLogs?: (filter?: string, lines?: number) => Promise<string>;
  /** Callback for web search */
  onWebSearch?: (query: string) => Promise<string>;
  /** Callback to read network requests from the running app */
  onReadNetworkRequests?: (filter?: string, statusCode?: number) => Promise<string>;
  /** Callback to generate an image */
  onGenerateImage?: (prompt: string, path: string, style?: string) => Promise<string>;
}

// ── Executors ────────────────────────────────────────────────────────────

export async function executeToolCall(
  call: ToolCall,
  ctx: ProjectContext,
): Promise<ToolResult> {
  try {
    const output = await executeByName(call.name, call.args, ctx);
    return { tool_call_id: call.id, output };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { tool_call_id: call.id, output: message, is_error: true };
  }
}

async function executeByName(
  name: string,
  args: Record<string, unknown>,
  ctx: ProjectContext,
): Promise<string> {
  switch (name) {
    case 'list_dir': {
      const path = String(args.path || '');
      const entries: Array<{ name: string; type: string; size: number }> = [];
      const prefix = path.endsWith('/') ? path : path + '/';
      const seen = new Set<string>();

      for (const filePath of Object.keys(ctx.files)) {
        if (prefix && !filePath.startsWith(prefix)) continue;
        const rel = filePath.slice(prefix.length);
        const slash = rel.indexOf('/');
        const name = slash === -1 ? rel : rel.slice(0, slash);
        if (!name || seen.has(name)) continue;
        seen.add(name);

        if (slash === -1) {
          entries.push({
            name,
            type: 'file',
            size: ctx.files[filePath]?.length || 0,
          });
        } else {
          entries.push({ name, type: 'dir', size: 0 });
        }
      }

      entries.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return JSON.stringify(entries, null, 2);
    }

    case 'view_file': {
      const path = String(args.path || '');
      const content = ctx.files[path];
      if (content === undefined) return `Error: file not found: ${path}`;

      const lines = content.split('\n');
      const startLine = typeof args.startLine === 'number' ? Math.max(1, Math.floor(args.startLine)) : 1;
      const endLine = typeof args.endLine === 'number' ? Math.min(lines.length, Math.floor(args.endLine)) : lines.length;

      const selected = lines.slice(startLine - 1, endLine);
      const numbered = selected.map((l, i) => `${String(startLine + i).padStart(4, ' ')}| ${l}`);
      return numbered.join('\n');
    }

    case 'write_file': {
      const path = String(args.path || '');
      const content = String(args.content || '');
      if (!path) return 'Error: path is required';
      if (shouldIgnorePreviewPath(path)) {
        return `Error: preview/build artifacts are ignored: ${path}`;
      }
      ctx.files[path] = content;
      if (ctx.onFileChange) await ctx.onFileChange(path, content);
      return `Wrote ${content.split('\n').length} lines to ${path}`;
    }

    case 'line_replace': {
      const path = String(args.path || '');
      const oldText = String(args.old_text || '');
      const newText = String(args.new_text || '');
      const firstLine = Number(args.first_line) || 1;
      const lastLine = Number(args.last_line) || firstLine;

      const content = ctx.files[path];
      if (content === undefined) return `Error: file not found: ${path}`;
      if (shouldIgnorePreviewPath(path)) {
        return `Error: preview/build artifacts are ignored: ${path}`;
      }

      const lines = content.split('\n');
      const slice = lines.slice(firstLine - 1, lastLine).join('\n');

      if (slice !== oldText) {
        return `Error: old_text does not match lines ${firstLine}-${lastLine} in ${path}. Expected:\n${oldText}\n\nActual:\n${slice}`;
      }

      const before = lines.slice(0, firstLine - 1);
      const after = lines.slice(lastLine);
      const newContent = [...before, newText, ...after].join('\n');

      ctx.files[path] = newContent;
      if (ctx.onFileChange) await ctx.onFileChange(path, newContent);
      return `Replaced lines ${firstLine}-${lastLine} in ${path}`;
    }

    case 'search_files': {
      const pattern = String(args.pattern || '');
      const glob = typeof args.glob === 'string' ? args.glob : undefined;
      if (!pattern) return 'Error: pattern is required';

      let regex: RegExp;
      try { regex = new RegExp(pattern, 'gi'); } catch {
        return `Error: invalid regex pattern: ${pattern}`;
      }

      const results: Array<{ path: string; lines: string[] }> = [];
      for (const [filePath, content] of Object.entries(ctx.files)) {
        if (glob && !matchGlob(filePath, glob)) continue;
        const matches: string[] = [];
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i]!)) {
            regex.lastIndex = 0;
            matches.push(`${i + 1}: ${lines[i]!.trim()}`);
          }
        }
        if (matches.length > 0) results.push({ path: filePath, lines: matches.slice(0, 10) });
      }

      if (results.length === 0) return 'No matches found';
      return results.map((r) => `${r.path}:\n${r.lines.map((l) => `  ${l}`).join('\n')}`).join('\n\n');
    }

    case 'read_dev_logs': {
      const filter = typeof args.filter === 'string' ? args.filter : undefined;
      const lines = typeof args.lines === 'number' ? args.lines : 50;
      if (ctx.onReadDevLogs) {
        return await ctx.onReadDevLogs(filter, lines);
      }
      // Fallback: simulate — in production, Docker sandbox would provide real logs
      return 'Dev server logs not available (sandbox not connected). Check the browser console for runtime errors.';
    }

    case 'web_search': {
      const query = String(args.query || '');
      if (!query) return 'Error: query is required';
      if (ctx.onWebSearch) return await ctx.onWebSearch(query);
      return `Web search not configured. Check docs for "${query}": https://nextjs.org/docs, https://tailwindcss.com/docs, https://react.dev`;
    }

    case 'read_network_requests': {
      const filter = typeof args.filter === 'string' ? args.filter : undefined;
      const statusCode = typeof args.statusCode === 'number' ? args.statusCode : undefined;
      if (ctx.onReadNetworkRequests) {
        return await ctx.onReadNetworkRequests(filter, statusCode);
      }
      return 'Network request inspection not available (sandbox not connected). Check the browser dev tools Network tab for HTTP errors.';
    }

    case 'generate_image': {
      const prompt = String(args.prompt || '');
      const path = String(args.path || '');
      const style = typeof args.style === 'string' ? args.style : undefined;
      if (!prompt) return 'Error: prompt is required';
      if (!path) return 'Error: path is required';
      if (ctx.onGenerateImage) {
        return await ctx.onGenerateImage(prompt, path, style);
      }
      return 'Image generation is not configured. Set REPLICATE_API_TOKEN or TOGETHER_API_KEY to enable AI image generation.';
    }

    default:
      return `Unknown tool: ${name}`;
  }
}

function matchGlob(filePath: string, glob: string): boolean {
  const regex = new RegExp(
    '^' + glob.replace(/\./g, '\\.').replace(/\*\*/g, '<<<GLOBSTAR>>>').replace(/\*/g, '[^/]*').replace(/<<<GLOBSTAR>>>/g, '.*') + '$',
  );
  return regex.test(filePath);
}
