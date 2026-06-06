/**
 * Shared Auth & Credit Helpers for Edge Functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export { corsHeaders } from './stream-ai.ts';

/**
 * Authenticate a request via Bearer token.
 * Returns the Supabase client (user-scoped) and the authenticated user.
 */
export async function authenticateRequest(req: Request): Promise<{
  supabase: any;
  user: { id: string; email?: string };
  errorResponse: Response | null;
}> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return {
      supabase: null,
      user: { id: '' },
      errorResponse: new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase,
      user: { id: '' },
      errorResponse: new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    };
  }

  return { supabase, user: { id: user.id, email: user.email }, errorResponse: null };
}

/**
 * Spend credits for an action. Returns an error response if credits are insufficient.
 */
export async function spendCredits(
  supabase: any,
  userId: string,
  amount: number,
  source: string,
  description: string,
  idempotencyKey?: string | null,
  metadata?: Record<string, unknown>,
): Promise<{ errorResponse: Response | null }> {
  const { error } = await supabase.rpc('spend_credits', {
    p_user_id: userId,
    p_amount: amount,
    p_source: source,
    p_description: description,
    p_idempotency_key: idempotencyKey || null,
    p_metadata: metadata || {},
  });

  if (error) {
    const msg = error.message || 'Failed to spend credits';
    const status = msg.toLowerCase().includes('insufficient') ? 402 : 500;
    return {
      errorResponse: new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  return { errorResponse: null };
}

/**
 * Create a run + step + job record for an AI operation.
 */
export async function createRunContext(
  supabase: any,
  userId: string,
  threadId: string,
  objective: string,
  idempotencyKey: string | null,
  model: string,
  credits: number,
  metadata?: Record<string, unknown>,
): Promise<{ runId: string | null; stepId: string | null }> {
  const { data: run } = await supabase
    .from('runs')
    .insert({
      thread_id: threadId,
      user_id: userId,
      status: 'running',
      objective,
      idempotency_key: idempotencyKey || null,
      started_at: new Date().toISOString(),
      metadata: { model, credits, ...(metadata || {}) },
    })
    .select('id')
    .single();

  const runId = run?.id || null;
  let stepId: string | null = null;

  if (runId) {
    const { data: step } = await supabase
      .from('run_steps')
      .insert({
        run_id: runId,
        step_index: 0,
        kind: 'llm',
        agent_name: 'edge',
        status: 'running',
        input: metadata || {},
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    stepId = step?.id || null;

    await supabase.from('jobs').insert({
      run_id: runId,
      queue: 'llm',
      status: 'running',
      kind: 'llm',
      payload: { kind: 'llm', objective, source: 'edge-function' },
    });
  }

  return { runId, stepId };
}
