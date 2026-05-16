/**
 * Admin Contact Messages API
 *
 * GET /api/admin/contact-messages - List contact form submissions
 * PATCH /api/admin/contact-messages - Mark messages as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { supabase } = await import('@/lib/supabase');
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
    const read = searchParams.get('read'); // 'true' | 'false' | null (all)
    const offset = (page - 1) * limit;

    let query = supabase
      .from('contact_messages')
      .select('*', { count: 'exact' });

    if (read === 'true') query = query.eq('is_read', true);
    else if (read === 'false') query = query.eq('is_read', false);

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      messages: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.max(1, Math.ceil((count || 0) / limit)),
      },
    });
  } catch (error) {
    console.error('Admin contact messages API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { ids } = body as { ids?: string[] };
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }

    const { supabase } = await import('@/lib/supabase');

    const { error } = await supabase
      .from('contact_messages')
      .update({ is_read: true })
      .in('id', ids);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, marked: ids.length });
  } catch (error) {
    console.error('Admin contact messages update API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
