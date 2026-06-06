import { NextResponse, type NextRequest } from 'next/server';

import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await ctx.params;

  // Return canonical project and its latest generation snapshot.
  const { data: project, error: projError } = await auth.supabase
    .from('projects')
    .select('id, name, description, stack, status, created_at, updated_at')
    .eq('id', id)
    .single();

  if (projError) return NextResponse.json({ error: projError.message }, { status: 404 });

  const { data: latestGen } = await auth.supabase
    .from('generations')
    .select('id, code, version, prompt, metadata, created_at')
    .eq('project_id', id)
    .order('version', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ project, latest: latestGen || null });
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

  const patch: Record<string, any> = {};
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
