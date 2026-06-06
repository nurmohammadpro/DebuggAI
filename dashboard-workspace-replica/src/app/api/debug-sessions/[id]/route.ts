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
    .from('debug_sessions')
    .select('id, language, code, error_message, fix, explanation, tags, created_at')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;
  const { id } = await ctx.params;

  const { error } = await auth.supabase
    .from('debug_sessions')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
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
  if (typeof body.error_message === 'string') patch.error_message = body.error_message.trim();
  if (typeof body.explanation === 'string') patch.explanation = body.explanation.trim();
  if (Array.isArray(body.tags)) patch.tags = body.tags;

  const { error } = await auth.supabase
    .from('debug_sessions')
    .update(patch)
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
