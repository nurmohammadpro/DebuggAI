import { NextResponse, type NextRequest } from 'next/server';

import { requireUser } from '@/lib/server/auth';
import { isEmailAdminAllowlisted } from '@/lib/admin/admin-allowlist';

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
      .select('id, email, full_name, avatar_url, plan_type, is_admin, metadata')
      .eq('id', user.id)
      .maybeSingle();
    response.profile = data
      ? {
          ...data,
          plan:
            (data as any).is_admin || isEmailAdminAllowlisted((data as any).email)
              ? 'enterprise'
              : ((data as any).plan_type || 'free'),
          is_admin: (data as any).is_admin || isEmailAdminAllowlisted((data as any).email),
        }
      : null;
  } catch {
    response.profile = null;
  }

  try {
    const { data } = await auth.supabase
      .from('credit_wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .maybeSingle();
    response.wallet = data || null;
  } catch {
    response.wallet = null;
  }

  return NextResponse.json(response);
}
