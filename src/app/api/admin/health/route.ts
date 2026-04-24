import { NextResponse, type NextRequest } from 'next/server';

import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin.errorResponse) return admin.errorResponse;

  const supabaseAdmin = createSupabaseAdmin();

  const checks: Record<string, any> = {};

  // Profiles table existence / basic connectivity
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    checks.profiles = error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    checks.profiles = {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }

  // Wallets table
  try {
    const { error } = await supabaseAdmin
      .from('credit_wallets')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    checks.credit_wallets = error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    checks.credit_wallets = {
      ok: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }

  // Required edge-function env
  checks.edge = {
    ok: Boolean(process.env.SUPABASE_EDGE_URL),
    configured: Boolean(process.env.SUPABASE_EDGE_URL),
  };

  const ok = Object.values(checks).every((c: any) => (c?.ok ?? true) === true);

  return NextResponse.json(
    {
      ok,
      checks,
      now: new Date().toISOString(),
    },
    { status: ok ? 200 : 207 }
  );
}

