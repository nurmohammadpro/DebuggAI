/**
 * Admin Credits API Route
 *
 * GET: List credit transactions (paginated)
 * POST: Manual credit adjustment
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
    const type = (searchParams.get('type') || '').trim();
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('credit_transactions')
      .select(
        `
          id,
          amount,
          type,
          source,
          description,
          created_at,
          wallet:credit_wallets!inner(
            user_id,
            profiles(email, full_name)
          )
        `,
        { count: 'exact' }
      );

    if (type) {
      query = query.eq('type', type);
    }

    const { data: transactions, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      transactions: transactions || [],
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

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const supabaseAdmin = createSupabaseAdmin();

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { userId, amount, description } = body as {
      userId?: string;
      amount?: number;
      description?: string;
    };

    if (!userId || typeof amount !== 'number' || !Number.isFinite(amount) || !description?.trim()) {
      return NextResponse.json(
        { error: 'userId, amount, and description are required' },
        { status: 400 }
      );
    }

    const { data: wallet, error: walletError } = await supabaseAdmin
      .from('credit_wallets')
      .select('id, balance')
      .eq('user_id', userId)
      .single();

    if (walletError) {
      return NextResponse.json({ error: walletError.message }, { status: 500 });
    }

    if (!wallet) {
      return NextResponse.json({ error: 'User wallet not found' }, { status: 404 });
    }

    const newBalance = (wallet.balance || 0) + amount;
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('credit_wallets')
      .update({ balance: newBalance })
      .eq('id', wallet.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { data: transaction, error: txError } = await supabaseAdmin
      .from('credit_transactions')
      .insert({
        wallet_id: wallet.id,
        amount,
        type: amount > 0 ? 'earned' : 'spent',
        source: 'admin_adjustment',
        description: `${description.trim()} (Admin: ${admin.user!.email})`,
      })
      .select()
      .single();

    if (txError) return NextResponse.json({ error: txError.message }, { status: 500 });

    return NextResponse.json({ transaction, newBalance });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

