/**
 * Admin Credits API
 *
 * POST /api/admin/users/[userId]/credits - Adjust user credits
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const currentUser = await requireAdmin();
    const { userId } = await params;
    const body = await request.json();
    const { amount, reason } = body;

    if (typeof amount !== 'number') {
      return NextResponse.json({ error: 'Amount must be a number' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    const { supabase } = await import('@/lib/supabase');

    // Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('credit_wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const newBalance = Math.max(0, wallet.balance + amount);

    // Update wallet balance
    const { error: updateError } = await supabase
      .from('credit_wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Record transaction
    const { error: txError } = await supabase
      .from('credit_transactions')
      .insert({
        wallet_id: wallet.id,
        amount: amount,
        type: amount > 0 ? 'admin_adjustment' : 'credit_spent',
        description: reason,
        metadata: { admin_action: true, admin_id: currentUser.id },
      });

    if (txError) {
      console.error('Failed to record transaction:', txError);
    }

    // Log audit event
    await supabase
      .from('audit_events')
      .insert({
        user_id: currentUser.id,
        action: 'admin.adjust_credits',
        target_id: userId,
        target_type: 'credit_wallet',
        metadata: { amount, reason, newBalance },
      });

    return NextResponse.json({
      success: true,
      newBalance,
      previousBalance: wallet.balance,
      adjustment: amount,
    });
  } catch (error) {
    console.error('Admin credits API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Admin') ? 403 : 500 }
    );
  }
}
