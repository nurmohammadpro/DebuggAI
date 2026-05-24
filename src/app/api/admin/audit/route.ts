/**
 * Admin Audit Logs API
 *
 * GET /api/admin/audit - Get audit log entries
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action') || '';
    const target_type = searchParams.get('target_type') || '';

    const supabase = createSupabaseAdmin();

    let query = supabase
      .from('audit_events')
      .select(`
        *,
        profiles (
          email
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (action) {
      query = query.ilike('action', `%${action}%`);
    }

    if (target_type) {
      query = query.eq('target_type', target_type);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const events = (data || []).map((event: any) => ({
      id: event.id,
      time: new Date(event.created_at).toLocaleTimeString('en-US', { hour12: false }),
      action: event.action,
      actor: event.profiles?.email || 'System',
      target_type: event.target_type,
      details: event.metadata?.description || null,
      ip: event.ip_address || 'N/A',
      created_at: event.created_at,
    }));

    return NextResponse.json({
      events,
      count: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Admin audit API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
