import { NextRequest, NextResponse } from 'next/server';

import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import {
  INTERNAL_TEST_COUPON_CODE,
  INTERNAL_TEST_COUPON_EMAIL,
  INTERNAL_TEST_CREDIT_BALANCE,
} from '@/lib/coupons/internal-test-coupon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null) as null | { couponCode?: string };
  const couponCode = (body?.couponCode || '').trim();

  if (!couponCode) {
    return NextResponse.json({ error: 'couponCode is required' }, { status: 400 });
  }

  const email = (auth.user?.email || '').trim().toLowerCase();
  if (email !== INTERNAL_TEST_COUPON_EMAIL) {
    return NextResponse.json(
      {
        error: 'This test coupon is not available for this account',
        detectedEmail: email,
        allowedEmail: INTERNAL_TEST_COUPON_EMAIL,
      },
      { status: 403 }
    );
  }

  if (couponCode !== INTERNAL_TEST_COUPON_CODE) {
    return NextResponse.json({ error: 'Invalid coupon code' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, plan_type')
    .eq('id', auth.user!.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: profileError?.message || 'Profile not found' }, { status: 500 });
  }

  const { data: wallet, error: walletError } = await supabase
    .from('credit_wallets')
    .select('id, balance')
    .eq('user_id', auth.user!.id)
    .maybeSingle();

  if (walletError) {
    return NextResponse.json({ error: walletError.message }, { status: 500 });
  }

  const currentBalance = typeof wallet?.balance === 'number' ? wallet.balance : 0;
  const targetBalance = INTERNAL_TEST_CREDIT_BALANCE;
  const delta = Math.max(0, targetBalance - currentBalance);

  const { error: profileUpdateError } = await supabase
    .from('profiles')
    .update({
      plan_type: 'enterprise',
      updated_at: now,
    })
    .eq('id', auth.user!.id);

  if (profileUpdateError) {
    return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
  }

  if (wallet) {
    const { error: walletUpdateError } = await supabase
      .from('credit_wallets')
      .update({
        balance: targetBalance,
        updated_at: now,
      })
      .eq('id', wallet.id);

    if (walletUpdateError) {
      return NextResponse.json({ error: walletUpdateError.message }, { status: 500 });
    }
  } else {
    const { error: walletInsertError } = await supabase
      .from('credit_wallets')
      .insert({
        user_id: auth.user!.id,
        balance: targetBalance,
      });

    if (walletInsertError) {
      return NextResponse.json({ error: walletInsertError.message }, { status: 500 });
    }
  }

  if (delta > 0) {
    const { data: refreshedWallet } = await supabase
      .from('credit_wallets')
      .select('id')
      .eq('user_id', auth.user!.id)
      .single();

    if (refreshedWallet?.id) {
      await supabase.from('credit_transactions').insert({
        wallet_id: refreshedWallet.id,
        amount: delta,
        type: 'earned',
        source: 'internal_test_coupon',
        description: `Internal test coupon redeemed for ${email}`,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    coupon: INTERNAL_TEST_COUPON_CODE,
    email,
    plan: 'enterprise',
    credits: targetBalance,
  });
}
