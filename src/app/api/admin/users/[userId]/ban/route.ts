/**
 * Admin Ban User API
 *
 * POST /api/admin/users/[userId]/ban - Ban a user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;
    const currentUser = admin.user!;
    const { userId } = await params;
    const body = await request.json().catch(() => ({}));
    const reason = body.reason || 'No reason provided';

    if (currentUser.id === userId) {
      return NextResponse.json({ error: 'Cannot ban yourself' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Set banned flag in user metadata (auth)
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { banned: true, ban_reason: reason, banned_at: new Date().toISOString() },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Log audit event
    await supabase.from('audit_events').insert({
      user_id: currentUser.id,
      action: 'admin.ban_user',
      target_id: userId,
      target_type: 'profile',
      metadata: { reason },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin ban API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
