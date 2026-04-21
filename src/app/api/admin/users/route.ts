/**
 * Admin Users API Route
 *
 * GET: List all users with pagination
 * PATCH: Update user (plan, admin status, etc.)
 * DELETE: Delete user
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isServerEmailAdminAllowlisted } from '@/lib/admin/admin-allowlist';

async function assertAdminAccess(supabaseAdmin: any, request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };
  }

  if (isServerEmailAdminAllowlisted(user.email)) {
    return { ok: true as const, user };
  }

  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Admin profile check failed. Database schema not ready.' },
        { status: 503 }
      ),
    };
  }

  const profile = profileData as { is_admin?: boolean } | null;
  if (!profile?.is_admin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }) };
  }

  return { ok: true as const, user };
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET /api/admin/users - List all users
export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const admin = await assertAdminAccess(supabaseAdmin, request);
    if (!admin.ok) return admin.response;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const plan = searchParams.get('plan');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, avatar_url, plan, is_admin, created_at, updated_at', { count: 'exact' });

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    if (plan && ['free', 'pro', 'enterprise'].includes(plan)) {
      query = query.eq('plan', plan);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/admin/users - Update user
export async function PATCH(request: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const admin = await assertAdminAccess(supabaseAdmin, request);
    if (!admin.ok) return admin.response;
    const user = admin.user;

    const body = await request.json();
    const { userId, plan, is_admin, full_name } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Prevent admin from removing their own admin status
    if (userId === user.id && is_admin === false) {
      return NextResponse.json({ error: 'Cannot remove your own admin status' }, { status: 400 });
    }

    const updateData: any = {};
    if (plan !== undefined) updateData.plan = plan;
    if (is_admin !== undefined) updateData.is_admin = is_admin;
    if (full_name !== undefined) updateData.full_name = full_name;

    const { data: updatedUser, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/users - Delete user
export async function DELETE(request: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    const admin = await assertAdminAccess(supabaseAdmin, request);
    if (!admin.ok) return admin.response;
    const user = admin.user;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Delete user (cascades to profile, wallet, etc.)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
