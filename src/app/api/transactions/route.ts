/**
 * Credit Transactions API
 *
 * GET /api/transactions - List user's credit transactions
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || '50')));
  const type = url.searchParams.get('type'); // earned | spent | refunded

  const { data: wallets } = await auth.supabase
    .from('credit_wallets')
    .select('id')
    .eq('user_id', auth.user!.id);

  const walletIds = ((wallets || []) as Array<{ id: string }>).map((w) => w.id);
  if (walletIds.length === 0) {
    return NextResponse.json({ transactions: [], pagination: { page, limit, total: 0, pages: 0 } });
  }

  let query = auth.supabase
    .from('credit_transactions')
    .select('id, amount, type, description, created_at', { count: 'exact' })
    .in('wallet_id', walletIds)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (type && ['earned', 'spent', 'refunded'].includes(type)) {
    query = query.eq('type', type);
  }

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    transactions: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.max(1, Math.ceil((count || 0) / limit)),
    },
  });
}
