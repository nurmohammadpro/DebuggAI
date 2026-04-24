/**
 * Admin Users API Route
 *
 * GET: List users with pagination/search/filter
 * PATCH: Update user (plan/admin/name)
 * DELETE: Delete user
 */

import { NextResponse, type NextRequest } from 'next/server';

import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const supabaseAdmin = createSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || '20')));
    const search = (searchParams.get('search') || '').trim();
    const plan = searchParams.get('plan');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, avatar_url, plan, is_admin, created_at, updated_at', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (plan && ['free', 'pro', 'enterprise'].includes(plan)) {
      query = query.eq('plan', plan);
    }

    const { data: users, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.max(1, Math.ceil((count || 0) / limit)),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const supabaseAdmin = createSupabaseAdmin();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { userId, plan, is_admin, full_name } = body as {
      userId?: string;
      plan?: string;
      is_admin?: boolean;
      full_name?: string;
    };

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Prevent admin from removing their own admin status
    if (userId === admin.user!.id && is_admin === false) {
      return NextResponse.json({ error: 'Cannot remove your own admin status' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (plan !== undefined) updateData.plan = plan;
    if (is_admin !== undefined) updateData.is_admin = is_admin;
    if (full_name !== undefined) updateData.full_name = full_name;

    const { data: updatedUser, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const supabaseAdmin = createSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === admin.user!.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

