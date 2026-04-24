import { NextResponse, type NextRequest } from 'next/server';

import { requireUser } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const user = auth.user!;

  const response: Record<string, any> = {
    user: { id: user.id, email: user.email },
    profile: null,
    wallet: null,
  };

  try {
    const { data } = await auth.supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, plan, is_admin, metadata')
      .eq('id', user.id)
      .maybeSingle();
    response.profile = data || null;
  } catch {
    response.profile = null;
  }

  try {
    const { data } = await auth.supabase
      .from('credit_wallets')
      .select('id, balance')
      .eq('owner_id', user.id)
      .maybeSingle();
    response.wallet = data || null;
  } catch {
    response.wallet = null;
  }

  return NextResponse.json(response);
}

