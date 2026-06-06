/**
 * Admin Abuse Report Resolution API
 *
 * PATCH /api/admin/abuse/[id] - Resolve or dismiss an abuse report
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;
    const currentUser = admin.user!;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status, resolution } = body as { status?: string; resolution?: string };

    if (!status || !['pending', 'investigating', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required: investigating, resolved, dismissed' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const updateData: Record<string, any> = {
      status,
      resolved_by: currentUser.id,
      resolved_at: status === 'resolved' || status === 'dismissed' ? new Date().toISOString() : null,
    };
    if (resolution) updateData.resolution = resolution;

    const { data, error } = await supabase
      .from('abuse_events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log audit event
    await supabase.from('audit_events').insert({
      user_id: currentUser.id,
      action: `admin.abuse_${status}`,
      target_id: id,
      target_type: 'abuse_event',
      metadata: { resolution },
    });

    return NextResponse.json({ report: data });
  } catch (error) {
    console.error('Admin abuse resolve API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
