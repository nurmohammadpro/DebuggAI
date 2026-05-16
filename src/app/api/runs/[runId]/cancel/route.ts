/**
 * Run Cancel API
 *
 * Sets a run and all its queued/leased/running jobs to 'canceled'.
 * Only the run owner or an admin can cancel.
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

  // Verify ownership
  const { data: run, error: runError } = await auth.supabase
    .from('runs')
    .select('id, user_id, status')
    .eq('id', runId)
    .single();

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });
  if (run.user_id !== auth.user!.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (run.status === 'succeeded' || run.status === 'failed' || run.status === 'canceled') {
    return NextResponse.json({ error: `Run is already ${run.status}` }, { status: 409 });
  }

  const supabase = createSupabaseAdmin();
  const now = new Date().toISOString();

  // Cancel all non-terminal jobs belonging to this run
  const { error: jobErr } = await supabase
    .from('jobs')
    .update({ status: 'canceled', locked_until: null, updated_at: now })
    .eq('run_id', runId)
    .in('status', ['queued', 'leased', 'running']);

  if (jobErr) return NextResponse.json({ error: jobErr.message }, { status: 500 });

  // Cancel all non-terminal steps
  const { error: stepErr } = await supabase
    .from('run_steps')
    .update({ status: 'skipped', ended_at: now })
    .eq('run_id', runId)
    .in('status', ['queued', 'running']);

  if (stepErr) return NextResponse.json({ error: stepErr.message }, { status: 500 });

  // Cancel the run itself
  const { error: runUpdErr } = await supabase
    .from('runs')
    .update({ status: 'canceled', ended_at: now, updated_at: now })
    .eq('id', runId);

  if (runUpdErr) return NextResponse.json({ error: runUpdErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, runId });
}
