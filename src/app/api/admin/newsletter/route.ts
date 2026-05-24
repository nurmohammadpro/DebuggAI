/**
 * Admin Newsletter API
 *
 * GET    /api/admin/newsletter  - List subscribers
 * PATCH  /api/admin/newsletter  - Update subscription status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const supabase = createSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || '50')));

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ subscribers: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { id, subscribed } = body as { id?: string; subscribed?: boolean };
    if (!id || typeof subscribed !== 'boolean') {
      return NextResponse.json({ error: 'id and subscribed are required' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ subscribed })
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
