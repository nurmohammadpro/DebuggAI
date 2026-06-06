/**
 * Admin User Details API
 *
 * GET /api/admin/users/[userId] - Get user details
 * PATCH /api/admin/users/[userId] - Update user
 * DELETE /api/admin/users/[userId] - Delete user
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const { userId } = await params;
    const supabase = createSupabaseAdmin();

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get wallet
    const { data: wallet } = await supabase
      .from('credit_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get recent activity
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('wallet_id', wallet?.id)
      .order('created_at', { ascending: false })
      .limit(10);

    return NextResponse.json({
      user: {
        ...profile,
        credits: wallet?.balance || 0,
        initials: profile.full_name
          ?.split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          ?.substring(0, 2) || '??',
      },
      wallet,
      recentActivity: transactions || [],
    });
  } catch (error) {
    console.error('Admin user detail API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Admin') ? 403 : 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;
    const currentUser = admin.user!;
    const { userId } = await params;
    const body = await request.json();

    const supabase = createSupabaseAdmin();

    // Prevent self-modification of sensitive fields
    if (currentUser.id === userId && body.is_admin !== undefined) {
      return NextResponse.json({ error: 'Cannot modify your own admin status' }, { status: 400 });
    }

    // Update profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .update({
        plan_type: body.plan_type,
        is_admin: body.is_admin,
        zero_knowledge_mode: body.zero_knowledge_mode,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log audit event
    await supabase
      .from('audit_events')
      .insert({
        user_id: currentUser.id,
        action: 'admin.update_user',
        target_id: userId,
        target_type: 'profile',
        metadata: { changes: body },
      });

    return NextResponse.json({ user: profile });
  } catch (error) {
    console.error('Admin user update API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Admin') ? 403 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;
    const currentUser = admin.user!;
    const { userId } = await params;
    const body = await request.json();
    const reason = body.reason || 'No reason provided';

    // Prevent self-deletion
    if (currentUser.id === userId) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();

    // Delete from auth (cascades to all tables)
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Log audit event
    await supabase
      .from('audit_events')
      .insert({
        user_id: currentUser.id,
        action: 'admin.delete_user',
        target_id: userId,
        target_type: 'profile',
        metadata: { reason },
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin user delete API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Admin') ? 403 : 500 }
    );
  }
}
