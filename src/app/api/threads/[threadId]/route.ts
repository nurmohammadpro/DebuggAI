/**
 * Thread Detail API
 *
 * Supports renaming and deleting threads.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ threadId: string }> },
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { threadId } = await ctx.params;
  if (!threadId) return NextResponse.json({ error: 'threadId is required' }, { status: 400 });

  const body = (await req.json().catch(() => null)) as null | { title?: string | null };
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const title = (body.title || '').trim();

  const { data, error } = await auth.supabase
    .from('threads')
    .update({ title: title || null, updated_at: new Date().toISOString() })
    .eq('id', threadId)
    .eq('user_id', auth.user!.id)
    .select('id, title, project_id, workspace_id, created_at, updated_at, metadata')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json({ thread: data });
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ threadId: string }> },
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { threadId } = await ctx.params;
  if (!threadId) return NextResponse.json({ error: 'threadId is required' }, { status: 400 });

  const { error } = await auth.supabase
    .from('threads')
    .delete()
    .eq('id', threadId)
    .eq('user_id', auth.user!.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

