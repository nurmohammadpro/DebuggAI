import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { isEmailAdminAllowlisted } from '@/lib/admin/admin-allowlist';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const user = auth.user!;
  let profile: {
    id: string;
    email: string | null;
    full_name: string | null;
    avatar_url: string | null;
    plan_type: string | null;
    is_admin: boolean | null;
  } | null = null;

  try {
    const { data } = await auth.supabase
      .from('profiles')
      .select('id,email,full_name,avatar_url,plan_type,is_admin')
      .eq('id', user.id)
      .maybeSingle();
    profile = data || null;
  } catch {
    profile = null;
  }

  let credits = 0;
  try {
    const { data } = await auth.supabase
      .from('credit_wallets')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();
    credits = typeof data?.balance === 'number' ? data.balance : 0;
  } catch {
    credits = 0;
  }

  const email = profile?.email || user.email || '';
  const isAdmin = Boolean(profile?.is_admin) || isEmailAdminAllowlisted(email);

  return NextResponse.json({
    id: user.id,
    email,
    displayName: profile?.full_name || email || 'Developer',
    avatarUrl: profile?.avatar_url || null,
    plan: isAdmin ? 'enterprise' : (profile?.plan_type || 'free'),
    credits,
    isAdmin,
  });
}
