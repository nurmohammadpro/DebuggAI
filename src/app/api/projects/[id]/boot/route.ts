import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await ctx.params;

  const [projResult, genResult, threadResult] = await Promise.all([
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

  return NextResponse.json({
    project,
    latest: latestGen || null,
    firstThread: firstThread || null,
  });
}
