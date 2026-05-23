import { NextResponse, type NextRequest } from 'next/server';
import { spawnSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface CheckResult {
  ok: boolean;
  [key: string]: unknown;
}

export async function GET(_req: NextRequest) {
  const checks: Record<string, CheckResult | Record<string, unknown>> = {};

  // 1. Environment variables
  checks.env = {
    ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    has_supabase_url: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    has_supabase_anon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    has_service_role: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    has_ai_key: Boolean(process.env.AI_API_KEY),
    has_stripe: Boolean(process.env.STRIPE_SECRET_KEY),
    has_sentry: Boolean(process.env.SENTRY_DSN),
    app_url: process.env.NEXT_PUBLIC_APP_URL || '(not set)',
    node_env: process.env.NODE_ENV || 'development',
  };

  // 2. Docker availability (required for live previews)
  try {
    const r = spawnSync('docker', ['version', '--format', '{{.Server.Version}}'], { encoding: 'utf-8', timeout: 5000 });
    checks.docker = {
      ok: !r.error && (r.status === 0 || r.status === null),
      version: r.status === 0 ? r.stdout.trim() : null,
    };

    // Also check how many debuggai sandbox containers are running
    if ((checks.docker as CheckResult).ok) {
      const ps = spawnSync('docker', ['ps', '--filter', 'name=debuggai-', '--format', '{{.Names}}'], { encoding: 'utf-8', timeout: 5000 });
      if (ps.status === 0) {
        (checks.docker as Record<string, unknown>).active_sandboxes = ps.stdout.split('\n').filter(Boolean).length;
      }
    }
  } catch {
    checks.docker = { ok: false };
  }

  // 3. Supabase connectivity (lightweight ping via anon client)
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (url && anon) {
      const t0 = Date.now();
      const client = createClient(url, anon);
      const { error } = await client.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
      checks.supabase = {
        ok: !error,
        latency_ms: Date.now() - t0,
        error: error ? error.message : undefined,
      };
    } else {
      checks.supabase = { ok: false, error: 'Supabase URL or anon key not configured' };
    }
  } catch (e) {
    checks.supabase = { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // 4. Disk space for sandbox projects
  try {
    const projectsDir = process.env.PROJECTS_DIR || '.projects';
    const df = spawnSync('df', ['-k', projectsDir], { encoding: 'utf-8', timeout: 5000 });
    if (df.status === 0) {
      const lines = df.stdout.trim().split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        const availableKB = parseInt(parts[3], 10);
        const usedPercent = parts[4];
        checks.disk = {
          ok: availableKB > 1048576, // warn if less than 1GB free
          available_gb: (availableKB / 1048576).toFixed(1),
          used_percent: usedPercent,
        };
      } else {
        checks.disk = { ok: true, note: 'Could not parse df output' };
      }
    } else {
      checks.disk = { ok: true, note: 'df not available (non-fatal)' };
    }
  } catch {
    checks.disk = { ok: true, note: 'Disk check skipped (non-fatal)' };
  }

  // Overall health: env + supabase must be ok; docker/disk are advisory
  const envOk = (checks.env as Record<string, unknown>)?.ok === true;
  const supabaseOk = (checks.supabase as CheckResult)?.ok !== false;
  const ok = envOk && supabaseOk;

  return NextResponse.json(
    { ok, checks, now: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}

