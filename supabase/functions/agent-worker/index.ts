/**
 * Agent Worker Edge Function
 *
 * Purpose:
 * - Lease jobs from the DB-backed queue (jobs table) using `lease_jobs(...)`
 * - Execute plan/llm/tool/patch/verify jobs with AI integration
 * - Mark jobs succeeded/failed with retry and dead-letter support
 *
 * Notes:
 * - This function is intended to run with SUPABASE_SERVICE_ROLE_KEY.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type LeaseBody = {
  action: 'lease';
  workerId: string;
  runId?: string;
  queue?: string;
  limit?: number;
  leaseSeconds?: number;
  execute?: boolean;
};

type CompleteBody = {
  action: 'complete';
  jobId: string;
  status: 'succeeded' | 'failed' | 'canceled';
  lastError?: string | null;
};

type Body = LeaseBody | CompleteBody;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'health') {
      return new Response(JSON.stringify({ ok: true, now: new Date().toISOString() }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'lease') {
      const workerId = (body.workerId || '').trim();
      if (!workerId) {
        return new Response(JSON.stringify({ error: 'workerId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const limit = Math.max(1, Math.min(25, Number(body.limit || 5)));
      const leaseSeconds = Math.max(10, Math.min(3600, Number(body.leaseSeconds || 60)));

      const runId = (body.runId || '').trim();
      const rpc = runId ? 'lease_jobs_for_run' : 'lease_jobs';
      const args = runId
        ? {
            p_worker_id: workerId,
            p_run_id: runId,
            p_limit: limit,
            p_lease_seconds: leaseSeconds,
          }
        : {
            p_worker_id: workerId,
            p_queue: ((body.queue || 'default').trim() || 'default'),
            p_limit: limit,
            p_lease_seconds: leaseSeconds,
          };

      const { data, error } = await supabase.rpc(rpc, args);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const jobs = (data || []) as Array<any>;

      // Optional: execute leased jobs immediately (best-effort).
      if (body.execute) {
        for (const job of jobs) {
          await executeJob(supabase, job).catch(() => {
            // executeJob handles its own error persistence best-effort
          });
        }
      }

      return new Response(JSON.stringify({ jobs }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (body.action === 'complete') {
      const jobId = (body.jobId || '').trim();
      if (!jobId) {
        return new Response(JSON.stringify({ error: 'jobId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const status = body.status;
      if (!['succeeded', 'failed', 'canceled'].includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('jobs')
        .update({
          status,
          last_error: body.lastError || null,
          locked_until: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function executeJob(supabase: any, job: any) {
  const jobId = job?.id;
  const runId = job?.run_id;
  const stepId = job?.run_step_id;
  const payload = job?.payload || {};
  const kind = payload?.kind || 'unknown';
  const maxAttempts = job?.max_attempts ?? 3;
  const attempts = (job?.attempts ?? 0) + 1;
  const timeoutSeconds = job?.timeout_seconds ?? 300;
  const now = new Date().toISOString();

  // Check if job has timed out while leased
  if (job?.locked_until && new Date(job.locked_until) < new Date()) {
    await failJob(supabase, jobId, stepId, runId, 'Job lease expired (timeout)', true);
    return;
  }

  // Mark running and extend lock
  const lockUntil = new Date(Date.now() + timeoutSeconds * 1000).toISOString();
  await supabase
    .from('jobs')
    .update({ status: 'running', locked_until: lockUntil, attempts, updated_at: now })
    .eq('id', jobId);

  if (stepId) {
    await supabase
      .from('run_steps')
      .update({ status: 'running', started_at: now })
      .eq('id', stepId);
  }

  await supabase
    .from('runs')
    .update({ status: 'running', started_at: now })
    .eq('id', runId)
    .eq('status', 'queued');

  // Dispatch by job kind
  try {
    switch (kind) {
      case 'plan':
        await executePlan(supabase, { jobId, runId, stepId, payload });
        break;
      case 'llm':
        await executeLLM(supabase, { jobId, runId, stepId, payload });
        break;
      case 'tool':
        await executeTool(supabase, { jobId, runId, stepId, payload });
        break;
      case 'patch':
        await executePatch(supabase, { jobId, runId, stepId, payload });
        break;
      case 'verify':
        await executeVerify(supabase, { jobId, runId, stepId, payload });
        break;
      default:
        throw new Error(`Unknown job kind: ${kind}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await failJob(supabase, jobId, stepId, runId, msg, attempts >= maxAttempts);
  }
}

async function failJob(
  supabase: any,
  jobId: string,
  stepId: string | null,
  runId: string,
  errorMsg: string,
  isDeadLetter: boolean,
) {
  const now = new Date().toISOString();
  const status = isDeadLetter ? 'failed' : 'queued';
  const dlq = isDeadLetter ? errorMsg : null;

  await supabase
    .from('jobs')
    .update({
      status,
      last_error: errorMsg,
      dlq_reason: dlq,
      locked_until: null,
      locked_by: null,
      updated_at: now,
    })
    .eq('id', jobId);

  if (stepId) {
    await supabase
      .from('run_steps')
      .update({ status: isDeadLetter ? 'failed' : 'queued', error: errorMsg, ended_at: now })
      .eq('id', stepId);
  }

  if (isDeadLetter) {
    await supabase
      .from('runs')
      .update({ status: 'failed', error: errorMsg, ended_at: now, updated_at: now })
      .eq('id', runId);

    // Audit: run failed via dead-letter
    await supabase.from('audit_events').insert({
      user_id: null,
      action: 'run.dead_letter',
      details: { runId, jobId, error: errorMsg },
      target_type: 'run',
      target_id: runId,
    });
  }
}

async function succeedJob(supabase: any, jobId: string, stepId: string | null, runId: string) {
  const now = new Date().toISOString();
  await supabase
    .from('jobs')
    .update({ status: 'succeeded', locked_until: null, updated_at: now })
    .eq('id', jobId);

  if (stepId) {
    await supabase
      .from('run_steps')
      .update({ status: 'succeeded', ended_at: now })
      .eq('id', stepId);
  }
}

// ---- Executors ----

async function executePlan(
  supabase: any,
  ctx: { jobId: string; runId: string; stepId: string | null; payload: any },
) {
  const objective = String(ctx.payload?.objective || '').trim();
  if (!objective) {
    // No objective — produce a minimal plan and succeed
    const plan = [{ step: 'No objective provided — skipping plan generation', status: 'skipped' }];
    if (ctx.stepId) {
      await supabase
        .from('run_steps')
        .update({ status: 'succeeded', output: { plan }, ended_at: new Date().toISOString() })
        .eq('id', ctx.stepId);
    }
    await supabase.from('runs').update({ status: 'succeeded', ended_at: new Date().toISOString() }).eq('id', ctx.runId);
    await supabase.from('jobs').update({ status: 'succeeded', locked_until: null, updated_at: new Date().toISOString() }).eq('id', ctx.jobId);
    return;
  }

  // Fetch thread messages for context
  const { data: run } = await supabase
    .from('runs')
    .select('thread_id')
    .eq('id', ctx.runId)
    .single();

  let contextMessages: Array<{ role: string; content: string }> = [];
  if (run?.thread_id) {
    const { data: messages } = await supabase
      .from('thread_messages')
      .select('role, content')
      .eq('thread_id', run.thread_id)
      .order('created_at', { ascending: true })
      .limit(20);
    contextMessages = (messages || []).map((m: any) => ({ role: m.role, content: m.content }));
  }

  const apiKey = Deno.env.get('AI_API_KEY');
  const baseUrl = Deno.env.get('AI_BASE_URL') || 'https://api.groq.com/openai/v1';
  const model = Deno.env.get('AI_MODEL') || 'llama-3.3-70b-versatile';

  if (!apiKey) {
    // No AI key — produce a generic plan
    const plan = [
      { step_index: 1, kind: 'llm', description: `Generate solution for: ${objective}` },
      { step_index: 2, kind: 'verify', description: 'Verify output correctness' },
    ];
    await finalizePlan(supabase, ctx, plan, objective, model);
    return;
  }

  const systemPrompt = `You are an AI orchestrator. Given a user's objective, produce a structured execution plan.

Output ONLY valid JSON (no markdown, no backticks) in this exact format:
{
  "plan": [
    { "step_index": 1, "kind": "llm", "description": "..." },
    { "step_index": 2, "kind": "tool", "tool_name": "read_file", "description": "...", "input": {} },
    { "step_index": 3, "kind": "patch", "description": "...", "artifact_kind": "diff" },
    { "step_index": 4, "kind": "verify", "description": "..." }
  ]
}

Valid kinds: "llm", "tool", "patch", "verify"
- "llm": AI generation step
- "tool": requires "tool_name" and optional "input" object
- "patch": produces an artifact, optional "artifact_kind" (diff, zip, report)
- "verify": validation step, optional "expected_pass" boolean

Keep plans concise (2-5 steps).`;

  try {
    const aiRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...contextMessages.slice(-10),
          { role: 'user', content: `Objective: ${objective}` },
        ],
        temperature: 0.4,
        max_tokens: 2048,
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      throw new Error(`AI API error: ${text}`);
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || '';
    // Strip markdown fences if present
    const json = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(json);
    const plan = parsed?.plan || [];

    // Log usage
    const usage = aiData.usage || {};
    await supabase.from('ai_usage_ledger').insert({
      user_id: ctx.payload?.user_id || null,
      run_id: ctx.runId,
      model,
      input_tokens: usage.prompt_tokens || null,
      output_tokens: usage.completion_tokens || null,
      credits_charged: 1,
      metadata: { source: 'plan_executor' },
    });

    await finalizePlan(supabase, ctx, plan, objective, model);
  } catch (err) {
    // On AI failure, fall back to a generic plan rather than failing the entire run
    const plan = [
      { step_index: 1, kind: 'llm', description: `Handle objective: ${objective}` },
      { step_index: 2, kind: 'verify', description: 'Verify result' },
    ];
    await finalizePlan(supabase, ctx, plan, objective, model);
  }
}

async function finalizePlan(
  supabase: any,
  ctx: { jobId: string; runId: string; stepId: string | null; payload: any },
  planSteps: any[],
  objective: string,
  model: string,
) {
  const now = new Date().toISOString();

  if (ctx.stepId) {
    await supabase
      .from('run_steps')
      .update({ status: 'succeeded', output: { plan: planSteps, objective, model }, ended_at: now })
      .eq('id', ctx.stepId);
  }

  // Create run_step records for each plan step (skip step_index 0, which is the plan itself)
  for (const ps of planSteps) {
    const idx = typeof ps.step_index === 'number' ? ps.step_index : 0;
    await supabase.from('run_steps').insert({
      run_id: ctx.runId,
      step_index: idx,
      kind: ps.kind || 'llm',
      agent_name: ps.agent_name || 'primary',
      status: 'queued',
      input: ps.input || { description: ps.description },
    });
  }

  // Enqueue jobs for each non-plan step
  for (const ps of planSteps) {
    const kind = ps.kind || 'llm';
    if (kind === 'plan') continue;
    await supabase.from('jobs').insert({
      run_id: ctx.runId,
      queue: kind === 'llm' ? 'llm' : 'default',
      priority: kind === 'llm' ? 50 : 100,
      status: 'queued',
      payload: {
        kind,
        objective,
        ...ps,
      },
    });
  }

  // Mark plan job succeeded
  await supabase
    .from('jobs')
    .update({ status: 'succeeded', locked_until: null, updated_at: now })
    .eq('id', ctx.jobId);

  // Mark run as running (not succeeded — follow-up jobs still need execution)
  await supabase
    .from('runs')
    .update({ status: 'running', updated_at: now })
    .eq('id', ctx.runId)
    .in('status', ['queued', 'running']);
}

async function executeLLM(
  supabase: any,
  ctx: { jobId: string; runId: string; stepId: string | null; payload: any },
) {
  const objective = String(ctx.payload?.objective || ctx.payload?.description || '').trim();

  // Fetch run and thread context
  const { data: run } = await supabase
    .from('runs')
    .select('thread_id, user_id')
    .eq('id', ctx.runId)
    .single();

  const threadId = run?.thread_id;
  const userId = run?.user_id;

  // Build messages from thread history
  const messages: Array<{ role: string; content: string }> = [];
  if (threadId) {
    const { data: threadMsgs } = await supabase
      .from('thread_messages')
      .select('role, content')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true })
      .limit(30);
    for (const m of threadMsgs || []) {
      messages.push({ role: m.role, content: m.content });
    }
  }

  if (!objective && messages.length === 0) {
    if (ctx.stepId) {
      await supabase
        .from('run_steps')
        .update({ status: 'succeeded', output: { note: 'No work needed' }, ended_at: new Date().toISOString() })
        .eq('id', ctx.stepId);
    }
    await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
    return;
  }

  const apiKey = Deno.env.get('AI_API_KEY');
  const baseUrl = Deno.env.get('AI_BASE_URL') || 'https://api.groq.com/openai/v1';
  const model = Deno.env.get('AI_MODEL') || 'llama-3.3-70b-versatile';

  if (!apiKey) {
    throw new Error('AI API key not configured');
  }

  const systemPrompt = `You are an AI coding assistant. Help the user accomplish their objective by generating code, answering questions, or providing guidance.

${objective ? `The current objective is: ${objective}` : 'Respond helpfully to the conversation.'}

When generating code, wrap it in markdown code blocks with the appropriate language identifier. Be concise and correct.`;

  messages.unshift({ role: 'system', content: systemPrompt });

  const aiRes = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!aiRes.ok) {
    const text = await aiRes.text();
    throw new Error(`AI API error: ${text}`);
  }

  const aiData = await aiRes.json();
  const content = aiData.choices?.[0]?.message?.content || '';
  const usage = aiData.usage || {};

  // Persist assistant message
  if (threadId && content) {
    await supabase.from('thread_messages').insert({
      thread_id: threadId,
      user_id: userId,
      role: 'assistant',
      content,
      model,
      tokens_in: usage.prompt_tokens || null,
      tokens_out: usage.completion_tokens || null,
      metadata: { source: 'llm_executor', run_id: ctx.runId },
    });
  }

  // Log usage
  await supabase.from('ai_usage_ledger').insert({
    user_id: userId,
    run_id: ctx.runId,
    model,
    input_tokens: usage.prompt_tokens || null,
    output_tokens: usage.completion_tokens || null,
    credits_charged: 1,
    metadata: { source: 'llm_executor' },
  });

  if (ctx.stepId) {
    await supabase
      .from('run_steps')
      .update({
        status: 'succeeded',
        output: { content: content.slice(0, 2000), model, tok_in: usage.prompt_tokens, tok_out: usage.completion_tokens },
        ended_at: new Date().toISOString(),
      })
      .eq('id', ctx.stepId);
  }

  await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);

  // Update thread's updated_at
  if (threadId) {
    await supabase
      .from('threads')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', threadId);
  }
}

async function executeTool(
  supabase: any,
  ctx: { jobId: string; runId: string; stepId: string | null; payload: any },
) {
  const toolName = ctx.payload?.tool_name || 'unknown';
  if (!ctx.stepId) {
    await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
    return;
  }

  // Record tool call
  await supabase.from('tool_calls').insert({
    run_step_id: ctx.stepId,
    tool_name: toolName,
    status: 'succeeded',
    input: ctx.payload?.input || {},
    output: { ok: true },
    started_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
  });

  await supabase
    .from('run_steps')
    .update({ status: 'succeeded', output: { tool_name: toolName, ok: true }, ended_at: new Date().toISOString() })
    .eq('id', ctx.stepId);

  await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
}

async function executePatch(
  supabase: any,
  ctx: { jobId: string; runId: string; stepId: string | null; payload: any },
) {
  if (!ctx.stepId) {
    await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
    return;
  }

  // Record artifact pointer (diff or full content)
  await supabase.from('artifacts').insert({
    run_id: ctx.runId,
    kind: ctx.payload?.artifact_kind || 'diff',
    content: ctx.payload?.content || null,
    metadata: { source: 'patch_executor' },
  });

  await supabase
    .from('run_steps')
    .update({ status: 'succeeded', output: { artifact_kind: ctx.payload?.artifact_kind || 'diff' }, ended_at: new Date().toISOString() })
    .eq('id', ctx.stepId);

  await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
}

async function executeVerify(
  supabase: any,
  ctx: { jobId: string; runId: string; stepId: string | null; payload: any },
) {
  if (!ctx.stepId) {
    await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
    return;
  }

  // Placeholder: in Phase B, this runs sandbox tests / linting
  const passed = ctx.payload?.expected_pass !== false;

  await supabase
    .from('run_steps')
    .update({ status: passed ? 'succeeded' : 'failed', output: { passed }, ended_at: new Date().toISOString() })
    .eq('id', ctx.stepId);

  await supabase
    .from('runs')
    .update({ status: passed ? 'succeeded' : 'failed', ended_at: new Date().toISOString() })
    .eq('id', ctx.runId);

  await supabase
    .from('jobs')
    .update({ status: passed ? 'succeeded' : 'failed', locked_until: null, updated_at: new Date().toISOString() })
    .eq('id', ctx.jobId);
}
