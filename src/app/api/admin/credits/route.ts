/**
 * Admin Credits API Route
 *
 * GET: Get all credit transactions
 * POST: Add/remove credits from user wallet
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { isServerEmailAdminAllowlisted } from '@/lib/admin/admin-allowlist';

async function assertAdminAccess(
  supabaseAdmin: any,
  request: NextRequest
) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const token = authHeader.split(' ')[1];
  const {
    data: { user },
    error: authError,
  } = await supabaseAdmin.auth.getUser(token);

  if (authError || !user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
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
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403 }
      ),
    };
  }

  return { ok: true as const, user };
}

// GET /api/admin/credits - List all credit transactions
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const admin = await assertAdminAccess(supabaseAdmin, request);
    if (!admin.ok) return admin.response;
    const user = admin.user;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const type = searchParams.get('type');
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('credit_transactions')
      .select(`
        *,
        wallet:credit_wallets!inner(
          owner_id,
          owner:profiles!owner_id(
            email,
            full_name
          )
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type && ['earned', 'spent', 'refunded'].includes(type)) {
      query = query.eq('type', type);
    }

    const { data: transactions, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      transactions,
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

// POST /api/admin/credits - Add/remove credits from user wallet
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const admin = await assertAdminAccess(supabaseAdmin, request);
    if (!admin.ok) return admin.response;
    const user = admin.user;

    const body = await request.json();
    const { userId, amount, description } = body;

    if (!userId || amount === undefined || !description) {
      return NextResponse.json(
        { error: 'userId, amount, and description are required' },
        { status: 400 }
      );
    }

    // Get user's wallet
    const { data: wallet } = await supabaseAdmin
      .from('credit_wallets')
      .select('id, balance')
      .eq('owner_id', userId)
      .single();

    if (!wallet) {
      return NextResponse.json({ error: 'User wallet not found' }, { status: 404 });
    }

    // Calculate new balance
    const newBalance = wallet.balance + amount;

    if (newBalance < 0) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      );
    }

    // Update wallet balance
    const { error: updateError } = await supabaseAdmin
      .from('credit_wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Record transaction
    const { data: transaction, error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        wallet_id: wallet.id,
        amount,
        type: amount > 0 ? 'earned' : 'spent',
        source: 'admin_adjustment',
        description: `${description} (Admin: ${user.email})`,
      })
      .select()
      .single();

    if (txError) {
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    return NextResponse.json({
      transaction,
      newBalance,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
