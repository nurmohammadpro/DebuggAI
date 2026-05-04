/**
 * Notifications API
 *
 * GET    /api/notifications        - List user notifications
 * PATCH  /api/notifications/[id]/read - Mark single notification as read
 * PATCH  /api/notifications        - Mark multiple notifications as read
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '20')));
  const unreadOnly = url.searchParams.get('unread') === 'true';

  let query = auth.supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', auth.user!.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (unreadOnly) query = query.eq('read', false);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    notifications: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.max(1, Math.ceil((count || 0) / limit)),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { ids, readAll } = body as { ids?: string[]; readAll?: boolean };

  if (readAll) {
    const { error } = await auth.supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', auth.user!.id)
      .eq('read', false);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array or readAll is required' }, { status: 400 });
  }

  const { error } = await auth.supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', auth.user!.id)
    .in('id', ids);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, marked: ids.length });
}
