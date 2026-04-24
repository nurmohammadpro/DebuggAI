import { NextResponse, type NextRequest } from 'next/server';

import { requireUser } from '@/lib/server/auth';

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id } = await ctx.params;

  const { data, error } = await auth.supabase
    .from('generations')
    .select('id, code, description, stack, prompt, version, metadata, created_at')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
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
  if (typeof body.description === 'string') patch.description = body.description.trim();
  if (typeof body.stack === 'string') patch.stack = body.stack;
  if (typeof body.prompt === 'string') patch.prompt = body.prompt;
  if (typeof body.code === 'string') patch.code = body.code;
  if (body.metadata && typeof body.metadata === 'object') patch.metadata = body.metadata;

  const { error } = await auth.supabase
    .from('generations')
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

  const { error } = await auth.supabase
    .from('generations')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
