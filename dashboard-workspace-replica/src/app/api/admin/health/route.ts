import { NextResponse, type NextRequest } from 'next/server';

import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin.errorResponse) return admin.errorResponse;

  const supabaseAdmin = createSupabaseAdmin();
  const checks: Record<string, any> = {};

  // Profiles table connectivity
  try {
    const t0 = Date.now();
    const { error } = await supabaseAdmin
      .from('profiles')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    checks.profiles = error
      ? { ok: false, error: error.message }
      : { ok: true, latency_ms: Date.now() - t0 };
  } catch (e) {
    checks.profiles = { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Credit wallets table
  try {
    const { error } = await supabaseAdmin
      .from('credit_wallets')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    checks.credit_wallets = error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    checks.credit_wallets = { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Edge function health — check agent-worker
  checks.edge = { ok: Boolean(process.env.SUPABASE_EDGE_URL), configured: Boolean(process.env.SUPABASE_EDGE_URL) };

  // DB pool stats via pg_stat_activity (read-only view)
  try {
    const { data: poolData, error: poolErr } = await supabaseAdmin
      .rpc('get_db_pool_stats');
    if (poolErr) {
      // RPC may not exist — fall back to counting runs as a connectivity proxy
      const { count, error: countErr } = await supabaseAdmin
        .from('runs')
        .select('*', { count: 'exact', head: true });
      checks.db_pool = countErr
        ? { ok: false, error: countErr.message }
        : { ok: true, total_runs: count, note: 'pool stats RPC not available — using runs count as proxy' };
    } else {
      checks.db_pool = { ok: true, ...(poolData as object) };
    }
  } catch (e) {
    checks.db_pool = { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Edge function latency check (agent-worker ping)
  try {
    const edgeUrl = process.env.SUPABASE_EDGE_URL;
    if (edgeUrl) {
      const t0 = Date.now();
      const pingRes = await fetch(`${edgeUrl}/functions/v1/agent-worker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({ action: 'health' }),
        signal: AbortSignal.timeout(8000),
      });
      checks.edge_latency = {
        ok: pingRes.ok,
        latency_ms: Date.now() - t0,
        status: pingRes.status,
      };
    } else {
      checks.edge_latency = { ok: false, error: 'SUPABASE_EDGE_URL not configured' };
    }
  } catch (e) {
    checks.edge_latency = { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Job queue depth
  try {
    const { count, error: queueErr } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .in('status', ['queued', 'leased', 'running']);
    checks.job_queue = queueErr
      ? { ok: false, error: queueErr.message }
      : { ok: true, active_jobs: count };
  } catch (e) {
    checks.job_queue = { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }

  // Dead-letter queue size
  try {
    const { count, error: dlqErr } = await supabaseAdmin
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')
      .not('dlq_reason', 'is', null);
    checks.dead_letter = dlqErr
      ? { ok: false, error: dlqErr.message }
      : { ok: true, dead_letter_count: count };
  } catch (e) {
    checks.dead_letter = { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }

  const ok = Object.values(checks).every((c: any) => (c?.ok ?? true) === true);

  return NextResponse.json(
    { ok, checks, now: new Date().toISOString() },
    { status: ok ? 200 : 207 }
  );
}
