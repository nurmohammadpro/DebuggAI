import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;
  const { id } = await ctx.params;

  const { error } = await auth.supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', auth.user!.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
