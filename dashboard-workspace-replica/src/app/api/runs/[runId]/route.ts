/**
 * Run Detail API
 *
 * Returns a single run with ordered steps and jobs.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { runId } = await ctx.params;
  if (!runId) return NextResponse.json({ error: 'runId is required' }, { status: 400 });

  const { data: run, error: runError } = await auth.supabase
    .from('runs')
    .select('id, thread_id, user_id, status, objective, idempotency_key, error, metadata, started_at, ended_at, created_at, updated_at')
    .eq('id', runId)
    .single();

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const { data: steps, error: stepsError } = await auth.supabase
    .from('run_steps')
    .select('id, run_id, step_index, kind, agent_name, status, input, output, error, started_at, ended_at, created_at')
    .eq('run_id', runId)
    .order('step_index', { ascending: true });

  if (stepsError) return NextResponse.json({ error: stepsError.message }, { status: 500 });

  const { data: jobs, error: jobsError } = await auth.supabase
    .from('jobs')
    .select('id, run_step_id, queue, priority, status, attempts, max_attempts, payload, last_error, locked_until, created_at, updated_at')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 });

  const { data: artifacts, error: artifactsError } = await auth.supabase
    .from('artifacts')
    .select('id, kind, storage_path, metadata, created_at')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  if (artifactsError) return NextResponse.json({ error: artifactsError.message }, { status: 500 });

  return NextResponse.json({
    run,
    steps: steps || [],
    jobs: jobs || [],
    artifacts: artifacts || [],
  });
}

