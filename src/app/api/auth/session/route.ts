import { createServerClient } from '@supabase/ssr';
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

/**
 * POST — sync the client-side session to an SSR cookie so the middleware
 * can see it on subsequent requests. Called by the login form immediately
 * after signInWithPassword succeeds.
 */
export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const body = await req.json().catch(() => null);
  const accessToken = body?.access_token as string | undefined;
  const refreshToken = body?.refresh_token as string | undefined;

  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: 'Missing tokens' }, { status: 400 });
  }

  let response = NextResponse.json({ ok: true });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return req.cookies.getAll(); },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

  return response;
}
