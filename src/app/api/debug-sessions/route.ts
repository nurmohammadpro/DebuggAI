/**
 * Debug Sessions API
 *
 * GET    /api/debug-sessions       - List user debug sessions
 * GET    /api/debug-sessions/[id]  - Get single session
 * DELETE /api/debug-sessions/[id]  - Delete session
 * PATCH  /api/debug-sessions/[id]  - Rename session
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '25')));
  const language = url.searchParams.get('language');
  const search = (url.searchParams.get('search') || '').trim();

  let query = auth.supabase
    .from('debug_sessions')
    .select('id, language, code, error_message, fix, explanation, tags, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (language) query = query.eq('language', language);
  if (search) query = query.or(`error_message.ilike.%${search}%,explanation.ilike.%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    sessions: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.max(1, Math.ceil((count || 0) / limit)),
    },
  });
}
