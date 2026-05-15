/**
 * Runs API
 *
 * A Run represents one user objective (e.g. "scan project and fix errors") that can fan out into steps/jobs.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null) as null | {
    threadId?: string;
    objective?: string;
    idempotencyKey?: string | null;
    enqueue?: boolean;
    queue?: string;
    priority?: number;
    metadata?: Record<string, unknown>;
  };

  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  if (!body.threadId) return NextResponse.json({ error: 'threadId is required' }, { status: 400 });

  const objective = (body.objective || '').trim();

  // 1) Create run
  const { data: run, error: runError } = await auth.supabase
    .from('runs')
    .insert({
      thread_id: body.threadId,
      user_id: auth.user!.id,
      status: 'queued',
      objective: objective || null,
      idempotency_key: body.idempotencyKey || null,
      metadata: body.metadata || {},
    })
    .select('id, thread_id, user_id, status, objective, idempotency_key, error, metadata, created_at, updated_at')
    .single();

  if (runError) return NextResponse.json({ error: runError.message }, { status: 500 });

  // 2) Seed step 0 (plan) + optionally enqueue job
  const { data: step, error: stepError } = await auth.supabase
    .from('run_steps')
    .insert({
      run_id: run.id,
      step_index: 0,
      kind: 'plan',
      agent_name: 'primary',
      status: 'queued',
      input: { objective: objective || null },
      output: {},
    })
    .select('id, run_id, step_index, kind, agent_name, status, input, output, error, created_at')
    .single();

  if (stepError) return NextResponse.json({ error: stepError.message }, { status: 500 });

  let job: any = null;
  if (body.enqueue) {
    const queue = (body.queue || 'default').trim() || 'default';
    const priority = typeof body.priority === 'number' ? body.priority : 100;
    const { data: createdJob, error: jobError } = await auth.supabase
      .from('jobs')
      .insert({
        run_id: run.id,
        run_step_id: step.id,
        queue,
        priority,
        status: 'queued',
        payload: { kind: 'plan', objective: objective || null },
      })
      .select('id, run_id, run_step_id, queue, priority, status, available_at, created_at')
      .single();

    if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
    job = createdJob;
  }

  return NextResponse.json({ run, step, job }, { status: 201 });
}

