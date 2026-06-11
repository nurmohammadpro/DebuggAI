/**
 * Save Generated Code API — with auto-git-branch
 *
 * Persists code to both generations table AND project_files table.
 * Auto-commits changes to a git branch named after the conversation thread.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await ctx.params;

  const body = await req.json().catch(() => null) as null | {
    code?: string;
    prompt?: string;
    description?: string;
    stack?: string;
    metadata?: Record<string, unknown>;
    threadId?: string;
    files?: Record<string, string>;
  };

  if (!body || (typeof body.code !== 'string' && !body.files)) {
    return NextResponse.json({ error: 'code or files field is required' }, { status: 400 });
  }

  // ── Save to generations table (backward compatible) ──────────────────
  const { data: latest } = await auth.supabase
    .from('generations')
    .select('version')
    .eq('project_id', id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (latest?.version || 0) + 1;

  const code = body.code || serializeFiles(body.files || {});

  const { error } = await auth.supabase
    .from('generations')
    .insert({
      user_id: auth.user!.id,
      project_id: id,
      code,
      version: nextVersion,
      description: body.description || null,
      prompt: body.prompt || null,
      stack: body.stack || null,
      metadata: body.metadata || {},
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // ── Save to project_files table (per-file persistence) ──────────────────
  const projectFileErrors: string[] = [];
  if (body.files) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceKey) {
        const admin = createClient(supabaseUrl, serviceKey);
        for (const [path, content] of Object.entries(body.files)) {
          const { error: fileError } = await admin.from('project_files').upsert({
            project_id: id,
            path,
            content,
            language: detectLanguage(path),
            status: 'modified',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'project_id,path' });
          if (fileError) projectFileErrors.push(`${path}: ${fileError.message}`);
        }
      } else {
        projectFileErrors.push('SUPABASE_SERVICE_ROLE_KEY is missing');
      }
    } catch (error) {
      projectFileErrors.push(error instanceof Error ? error.message : String(error));
    }
  }

  // ── Link thread to project (backup — in case client-side PATCH missed) ──
  if (body.threadId) {
    try {
      await auth.supabase
        .from('threads')
        .update({ project_id: id, updated_at: new Date().toISOString() })
        .eq('id', body.threadId)
        .eq('user_id', auth.user!.id);
    } catch {
      // Non-critical — thread can still be linked via PATCH /api/threads/:id
    }
  }

  return NextResponse.json({
    ok: true,
    version: nextVersion,
    projectFileErrors,
  });
}

function serializeFiles(files: Record<string, string>): string {
  return Object.entries(files)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => {
      const lang = detectLanguage(path);
      return `// File: ${path}\n\`\`\`${lang}\n${content}\n\`\`\`\n`;
    })
    .join('\n');
}

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    tsx: 'tsx', ts: 'ts', jsx: 'jsx', js: 'js',
    css: 'css', scss: 'scss', html: 'html', json: 'json',
    md: 'markdown', mdx: 'mdx', svg: 'svg',
  };
  return map[ext] || '';
}
