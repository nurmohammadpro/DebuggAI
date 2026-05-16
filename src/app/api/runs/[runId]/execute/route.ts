/**
 * Run Execute API
 *
 * Securely leases and executes jobs for a single run using the Supabase Edge worker.
 * This keeps job leasing multi-tenant safe (scoped by run_id) and prevents client-side
 * access to service role secrets.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { runId } = await ctx.params;
  if (!runId) return NextResponse.json({ error: 'runId is required' }, { status: 400 });

  // Verify ownership using the caller-scoped client (RLS).
  const { data: run, error: runError } = await auth.supabase
    .from('runs')
    .select('id, user_id, status')
    .eq('id', runId)
    .single();

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  if (run.user_id !== auth.user!.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null) as null | {
    workerId?: string;
    limit?: number;
    leaseSeconds?: number;
  };

  const workerId = (body?.workerId || `web-${auth.user!.id}`).trim();
  const limit = Math.max(1, Math.min(25, Number(body?.limit || 5)));
  const leaseSeconds = Math.max(10, Math.min(3600, Number(body?.leaseSeconds || 60)));

  // Call the Supabase Edge worker with service role auth.
  const supabase = createSupabaseAdmin();
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/agent-worker`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      action: 'lease',
      workerId,
      runId,
      limit,
      leaseSeconds,
      execute: true,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof json?.error === 'string' ? json.error : 'Failed to execute run';
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  // Best-effort: refetch run status via admin (no RLS) to return latest state.
  const { data: latestRun } = await supabase
    .from('runs')
    .select('id, status, error, started_at, ended_at, updated_at')
    .eq('id', runId)
    .single();

  return NextResponse.json({ ok: true, leased: json?.jobs || [], run: latestRun || null });
}

