/**
 * Credits API
 *
 * GET /api/credits - Get current user's credit balance
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { data: wallet, error } = await auth.supabase
    .from('credit_wallets')
    .select('id, balance, updated_at')
    .eq('user_id', auth.user!.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!wallet) {
    // Create wallet for user on first access
    const { data: newWallet, error: createError } = await auth.supabase
      .from('credit_wallets')
      .insert({ user_id: auth.user!.id, balance: 30 })
      .select('id, balance, updated_at')
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({ balance: newWallet.balance, updated_at: newWallet.updated_at });
  }

  return NextResponse.json({ balance: wallet.balance, updated_at: wallet.updated_at });
}
