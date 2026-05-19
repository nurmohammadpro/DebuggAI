/**
 * Admin Runs API
 *
 * Lists all runs across all users with search, filter, and pagination.
 * Admin-only: requires service role or admin authentication.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin.errorResponse) return admin.errorResponse;

  const supabase = createSupabaseAdmin();
  const url = new URL(req.url);

  const status = url.searchParams.get('status');
  const userId = url.searchParams.get('userId');
  const search = url.searchParams.get('search');
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 25)));
  const page = Math.max(0, Number(url.searchParams.get('page') || 0));

  let query = supabase
    .from('runs')
    .select('id, thread_id, user_id, status, objective, error, started_at, ended_at, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (status) query = query.eq('status', status);
  if (userId) query = query.eq('user_id', userId);
  if (search) query = query.or(`objective.ilike.%${search}%,error.ilike.%${search}%`);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with user emails
  const userIds = [...new Set((data || []).map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email')
    .in('id', userIds.length > 0 ? userIds : ['none']);

  const emailMap = new Map((profiles || []).map((p: any) => [p.id, p.email]));

  const enriched = (data || []).map((r) => ({
    ...r,
    user_email: emailMap.get(r.user_id) || r.user_id,
  }));

  return NextResponse.json({ runs: enriched, total: count || 0 });
}
