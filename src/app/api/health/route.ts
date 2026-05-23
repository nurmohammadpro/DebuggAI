import { NextResponse, type NextRequest } from 'next/server';
import { spawnSync } from 'child_process';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const checks: Record<string, unknown> = {};

  checks.env = {
    ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    has_supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    has_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    has_ai_key: Boolean(process.env.AI_API_KEY),
  };

  // Optional: Docker availability (only required for live previews).
  try {
    const r = spawnSync('docker', ['version'], { stdio: 'ignore' });
    checks.docker = { ok: !r.error && (r.status === 0 || r.status === null) };
  } catch {
    checks.docker = { ok: false };
  }

  const ok =
    typeof checks.env === 'object' &&
    (checks.env as any)?.ok === true;

  return NextResponse.json(
    { ok, checks, now: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}

