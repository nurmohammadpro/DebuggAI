import { NextResponse, type NextRequest } from 'next/server';

import { requireUser } from '@/lib/server/auth';
import { type VirtualFile } from '@/lib/project/virtual-files';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await ctx.params;

  // Fetch project and latest generation in parallel — they don't depend on each other.
  const [projResult, genResult, filesResult] = await Promise.all([
    auth.supabase
      .from('projects')
      .select('id, name, description, stack, status, created_at, updated_at')
      .eq('id', id)
      .single(),
    auth.supabase
      .from('generations')
      .select('id, code, version, prompt, metadata, created_at')
      .eq('project_id', id)
      .order('version', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    auth.supabase
      .from('project_files')
      .select('path, content, language, status')
      .eq('project_id', id)
      .order('path', { ascending: true }),
  ]);

  const { data: project, error: projError } = projResult;
  if (projError) return NextResponse.json({ error: projError.message }, { status: 404 });

  const { data: latestGen } = genResult;
  const fileTreeCode = serializeProjectFiles(filesResult.data || []);
  const latest = latestGen
    ? {
        ...latestGen,
        code: fileTreeCode || (latestGen.code?.trim() ? latestGen.code : ''),
      }
    : fileTreeCode
      ? {
          id: `${id}:project-files`,
          code: fileTreeCode,
          version: 1,
          prompt: project.description,
          metadata: null,
          created_at: project.updated_at || project.created_at,
        }
      : null;

  return NextResponse.json({ project, latest });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const patch: Partial<{
    name: string;
    stack: string;
    description: string;
  }> = {};
  if (typeof body.description === 'string') patch.name = body.description.trim();
  if (typeof body.stack === 'string') patch.stack = body.stack;
  if (typeof body.prompt === 'string') patch.description = body.prompt;

  const { error } = await auth.supabase
    .from('projects')
    .update(patch)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

type ProjectFileRow = {
  path?: string | null;
  content?: string | null;
  language?: string | null;
  status?: VirtualFile['status'] | null;
};

function serializeProjectFiles(rows: ProjectFileRow[]) {
  const files: Record<string, VirtualFile> = {};

  for (const row of rows) {
    if (!row.path || row.status === 'deleted') continue;
    files[row.path] = {
      path: row.path,
      content: row.content || '',
      language: row.language || undefined,
      status: row.status || 'unchanged',
    };
  }

  const paths = Object.keys(files);
  if (paths.length === 0) return null;

  return paths
    .sort()
    .map((path) => {
      const file = files[path]!;
      return [
        `// File: ${path}`,
        '```' + (file.language || languageFromPath(path) || ''),
        file.content.replace(/\s+$/, ''),
        '```',
        '',
      ].join('\n');
    })
    .join('\n');
}

function languageFromPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith('.tsx')) return 'typescript';
  if (lower.endsWith('.ts')) return 'typescript';
  if (lower.endsWith('.jsx')) return 'javascript';
  if (lower.endsWith('.js')) return 'javascript';
  if (lower.endsWith('.css')) return 'css';
  if (lower.endsWith('.html')) return 'html';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.md')) return 'markdown';
  return '';
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await ctx.params;

  const { error } = await auth.supabase.from('projects').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
