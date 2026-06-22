import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { normalizePreviewCode, type VirtualFile, shouldIgnorePreviewPath } from '@/lib/project/virtual-files';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await ctx.params;

  const [projResult, genResult, threadResult, filesResult] = await Promise.all([
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
      .from('threads')
      .select('id, title, project_id, created_at, updated_at')
      .eq('project_id', id)
      .eq('user_id', auth.user!.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    auth.supabase
      .from('project_files')
      .select('path, content, language, status')
      .eq('project_id', id)
      .order('path', { ascending: true }),
  ]);

  const { data: project, error: projError } = projResult;
  if (projError || !project) {
    return NextResponse.json(
      { error: projError?.message || 'Not found' },
      { status: 404 },
    );
  }

  const { data: latestGen } = genResult;
  const { data: firstThread } = threadResult;
  const fileTreeCode = serializeProjectFiles(filesResult.data || []);
  const latestGenCode = latestGen?.code?.trim() ? normalizePreviewCode(latestGen.code) : '';
  const latest = latestGen
    ? {
        ...latestGen,
        code: fileTreeCode || latestGenCode,
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

  return NextResponse.json({
    project,
    latest,
    firstThread: firstThread || null,
  });
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
    if (!row.path || row.status === 'deleted' || shouldIgnorePreviewPath(row.path)) continue;
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
