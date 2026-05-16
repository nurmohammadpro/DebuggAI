/**
 * Admin Run Detail API
 *
 * Full run detail including steps, jobs, and artifacts.
 * Supports admin force-cancel and retry actions.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const supabase = createSupabaseAdmin();
  const { runId } = await ctx.params;

  const { data: run, error } = await supabase
    .from('runs')
    .select('id, thread_id, user_id, status, objective, error, metadata, started_at, ended_at, created_at, updated_at')
    .eq('id', runId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!run) return NextResponse.json({ error: 'Run not found' }, { status: 404 });

  const { data: steps } = await supabase
    .from('run_steps')
    .select('*')
    .eq('run_id', runId)
    .order('step_index', { ascending: true });

  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  const { data: artifacts } = await supabase
    .from('artifacts')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true });

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, plan_type')
    .eq('id', run.user_id)
    .single();

  return NextResponse.json({
    run: { ...run, user_email: profile?.email, user_plan: profile?.plan_type },
    steps: steps || [],
    jobs: jobs || [],
    artifacts: artifacts || [],
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ runId: string }> }) {
  const supabase = createSupabaseAdmin();
  const { runId } = await ctx.params;
  const body = await req.json().catch(() => null) as null | { action: 'cancel' | 'retry' };

  if (!body?.action) return NextResponse.json({ error: 'action is required (cancel | retry)' }, { status: 400 });

  const now = new Date().toISOString();

  if (body.action === 'cancel') {
    await supabase.from('jobs').update({ status: 'canceled', updated_at: now }).eq('run_id', runId).in('status', ['queued', 'leased', 'running']);
    await supabase.from('run_steps').update({ status: 'skipped', ended_at: now }).eq('run_id', runId).in('status', ['queued', 'running']);
    await supabase.from('runs').update({ status: 'canceled', ended_at: now, updated_at: now }).eq('id', runId);
    return NextResponse.json({ ok: true, action: 'canceled' });
  }

  if (body.action === 'retry') {
    // Reset failed items back to queued
    await supabase.from('jobs').update({ status: 'queued', attempts: 0, last_error: null, locked_until: null, locked_by: null, updated_at: now }).eq('run_id', runId).eq('status', 'failed');
    await supabase.from('run_steps').update({ status: 'queued', error: null, ended_at: null }).eq('run_id', runId).eq('status', 'failed');
    await supabase.from('runs').update({ status: 'queued', error: null, ended_at: null, updated_at: now }).eq('id', runId);
    return NextResponse.json({ ok: true, action: 'retried' });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
