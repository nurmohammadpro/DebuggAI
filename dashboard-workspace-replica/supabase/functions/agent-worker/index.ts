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
  const baseUrl = Deno.env.get('AI_BASE_URL') || 'https://api.deepseek.com/v1';
  const model = Deno.env.get('AI_MODEL') || 'deepseek-chat';

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
  const baseUrl = Deno.env.get('AI_BASE_URL') || 'https://api.deepseek.com/v1';
  const model = Deno.env.get('AI_MODEL') || 'deepseek-chat';

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
  const input = ctx.payload?.input || {};

  if (!ctx.stepId) {
    await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
    return;
  }

  const now = new Date().toISOString();
  let output: any = { ok: true };
  let toolStatus: 'succeeded' | 'failed' = 'succeeded';

  try {
    switch (toolName) {
      case 'read_file': {
        const filePath = input?.path || input?.file_path || '';
        if (!filePath) throw new Error('Missing file path');

        const { data: artifacts, error } = await supabase
          .from('artifacts')
          .select('id, content, metadata, created_at')
          .eq('run_id', ctx.runId)
          .eq('kind', 'file')
          .filter('metadata->>path', 'eq', filePath)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) throw new Error(`DB error: ${error.message}`);
        if (!artifacts || artifacts.length === 0) {
          output = { ok: true, content: null, path: filePath, note: 'File not found' };
        } else {
          output = { ok: true, content: artifacts[0].content, path: filePath, id: artifacts[0].id };
        }
        break;
      }

      case 'write_file': {
        const filePath = input?.path || input?.file_path || '';
        const content = input?.content ?? '';
        if (!filePath) throw new Error('Missing file path');

        // Upsert: delete existing file artifact, then insert new version
        await supabase
          .from('artifacts')
          .delete()
          .eq('run_id', ctx.runId)
          .eq('kind', 'file')
          .filter('metadata->>path', 'eq', filePath);

        const { data: inserted, error: insertErr } = await supabase
          .from('artifacts')
          .insert({
            run_id: ctx.runId,
            kind: 'file',
            content,
            metadata: { path: filePath, tool: 'write_file', size: content.length },
          })
          .select('id')
          .single();

        if (insertErr) throw new Error(`Insert error: ${insertErr.message}`);
        output = { ok: true, path: filePath, id: inserted?.id, bytesWritten: content.length };
        break;
      }

      case 'list_files': {
        const prefix = input?.prefix || '';
        let query = supabase
          .from('artifacts')
          .select('id, metadata, created_at')
          .eq('run_id', ctx.runId)
          .eq('kind', 'file')
          .order('created_at', { ascending: false });

        if (prefix) {
          query = query.ilike('metadata->>path', `${prefix}%`);
        }

        const { data: files, error } = await query;
        if (error) throw new Error(`DB error: ${error.message}`);

        output = {
          ok: true,
          files: (files || []).map((f: any) => ({
            id: f.id,
            path: f.metadata?.path || '',
            created_at: f.created_at,
          })),
        };
        break;
      }

      case 'delete_file': {
        const filePath = input?.path || input?.file_path || '';
        if (!filePath) throw new Error('Missing file path');

        const { error } = await supabase
          .from('artifacts')
          .delete()
          .eq('run_id', ctx.runId)
          .eq('kind', 'file')
          .filter('metadata->>path', 'eq', filePath);

        if (error) throw new Error(`Delete error: ${error.message}`);
        output = { ok: true, path: filePath, deleted: true };
        break;
      }

      default:
        output = { ok: true, tool_name: toolName, note: 'Unrecognized tool — no-op' };
    }
  } catch (err) {
    toolStatus = 'failed';
    output = { ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  await supabase.from('tool_calls').insert({
    run_step_id: ctx.stepId,
    tool_name: toolName,
    status: toolStatus,
    input,
    output,
    started_at: now,
    ended_at: new Date().toISOString(),
  });

  await supabase
    .from('run_steps')
    .update({
      status: toolStatus,
      output: { tool_name: toolName, ...output },
      ...(toolStatus === 'failed' ? { error: output.error } : {}),
      ended_at: new Date().toISOString(),
    })
    .eq('id', ctx.stepId);

  if (toolStatus === 'failed') {
    await failJob(supabase, ctx.jobId, ctx.stepId, ctx.runId, output.error, false);
  } else {
    await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
  }
}

async function executePatch(
  supabase: any,
  ctx: { jobId: string; runId: string; stepId: string | null; payload: any },
) {
  if (!ctx.stepId) {
    await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
    return;
  }

  const now = new Date().toISOString();
  const artifactKind = ctx.payload?.artifact_kind || 'diff';

  try {
    // Fetch the most recent LLM output from run_steps for this run
    const { data: llmSteps } = await supabase
      .from('run_steps')
      .select('output')
      .eq('run_id', ctx.runId)
      .eq('kind', 'llm')
      .eq('status', 'succeeded')
      .order('ended_at', { ascending: false })
      .limit(1);

    const llmOutput = llmSteps?.[0]?.output;
    const llmContent: string = llmOutput?.content || ctx.payload?.content || '';

    if (!llmContent) {
      // No content to patch — record empty artifact and succeed
      await supabase.from('artifacts').insert({
        run_id: ctx.runId,
        kind: artifactKind,
        content: null,
        metadata: { source: 'patch_executor', note: 'No LLM output to extract' },
      });

      await supabase
        .from('run_steps')
        .update({ status: 'succeeded', output: { filesWritten: 0, note: 'No content' }, ended_at: new Date().toISOString() })
        .eq('id', ctx.stepId);

      await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
      return;
    }

    // Extract code blocks from markdown (```language ... ```)
    const codeBlockRegex = /```(\w+)?(?:\s+(?:title|path|file)[=:]\s*["']?([^\s"'\n]+)["']?)?\n([\s\S]*?)```/g;
    const extractedFiles: Array<{ path: string; content: string; language: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(llmContent)) !== null) {
      const language = match[1] || 'text';
      const pathHint = match[2];
      const code = match[3]?.trim() || '';

      if (!code) continue;

      const filePath = pathHint || inferFilePath(language, extractedFiles.length);
      extractedFiles.push({ path: filePath, content: code, language });
    }

    // If no code blocks found, treat entire output as a report artifact
    if (extractedFiles.length === 0) {
      await supabase.from('artifacts').insert({
        run_id: ctx.runId,
        kind: 'report',
        content: llmContent,
        metadata: { source: 'patch_executor', note: 'Full output (no code blocks found)' },
      });

      await supabase
        .from('run_steps')
        .update({ status: 'succeeded', output: { filesWritten: 0, note: 'Report saved, no code blocks' }, ended_at: new Date().toISOString() })
        .eq('id', ctx.stepId);

      await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
      return;
    }

    // Write each extracted file as an artifact (delete old, insert new)
    for (const file of extractedFiles) {
      await supabase
        .from('artifacts')
        .delete()
        .eq('run_id', ctx.runId)
        .eq('kind', 'file')
        .filter('metadata->>path', 'eq', file.path);

      await supabase.from('artifacts').insert({
        run_id: ctx.runId,
        kind: 'file',
        content: file.content,
        metadata: {
          path: file.path,
          language: file.language,
          source: 'patch_executor',
          size: file.content.length,
        },
      });
    }

    // Also save the raw diff/report artifact
    await supabase.from('artifacts').insert({
      run_id: ctx.runId,
      kind: artifactKind,
      content: llmContent,
      metadata: {
        source: 'patch_executor',
        filesExtracted: extractedFiles.length,
        filePaths: extractedFiles.map((f) => f.path),
      },
    });

    await supabase
      .from('run_steps')
      .update({
        status: 'succeeded',
        output: { filesWritten: extractedFiles.length, filePaths: extractedFiles.map((f) => f.path) },
        ended_at: new Date().toISOString(),
      })
      .eq('id', ctx.stepId);

    await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    await supabase.from('artifacts').insert({
      run_id: ctx.runId,
      kind: artifactKind,
      content: ctx.payload?.content || null,
      metadata: { source: 'patch_executor', error: msg },
    });

    await supabase
      .from('run_steps')
      .update({ status: 'failed', error: msg, ended_at: new Date().toISOString() })
      .eq('id', ctx.stepId);

    await failJob(supabase, ctx.jobId, ctx.stepId, ctx.runId, msg, false);
  }
}

function inferFilePath(language: string, index: number): string {
  const defaultPaths: Record<string, string> = {
    typescript: `src/generated_${index}.ts`,
    tsx: `src/components/Generated${index}.tsx`,
    javascript: `src/generated_${index}.js`,
    jsx: `src/components/Generated${index}.jsx`,
    css: `src/styles/generated_${index}.css`,
    html: `public/generated_${index}.html`,
    json: `data/generated_${index}.json`,
    sql: `migrations/generated_${index}.sql`,
    python: `generated_${index}.py`,
  };
  return defaultPaths[language.toLowerCase()] || `generated_${index}.${language || 'txt'}`;
}

async function executeVerify(
  supabase: any,
  ctx: { jobId: string; runId: string; stepId: string | null; payload: any },
) {
  if (!ctx.stepId) {
    await succeedJob(supabase, ctx.jobId, ctx.stepId, ctx.runId);
    return;
  }

  try {
    // Fetch all file artifacts for this run
    const { data: files } = await supabase
      .from('artifacts')
      .select('id, content, metadata')
      .eq('run_id', ctx.runId)
      .eq('kind', 'file');

    const checks: Array<{ path: string; passed: boolean; errors: string[] }> = [];

    for (const file of files || []) {
      const path = file.metadata?.path || 'unknown';
      const language = file.metadata?.language || detectLanguageFromPath(path);
      const content = file.content || '';
      const result = validateSyntax(content, language);
      checks.push({ path, passed: result.passed, errors: result.errors });
    }

    // If no files, check if there's recent LLM output to validate
    if (checks.length === 0) {
      const { data: llmSteps } = await supabase
        .from('run_steps')
        .select('output')
        .eq('run_id', ctx.runId)
        .eq('kind', 'llm')
        .eq('status', 'succeeded')
        .order('ended_at', { ascending: false })
        .limit(1);

      const content = llmSteps?.[0]?.output?.content || '';
      if (content) {
        const result = validateSyntax(content, 'markdown');
        checks.push({ path: 'llm_output', passed: result.passed, errors: result.errors });
      }
    }

    const allPassed = checks.length > 0 && checks.every((c) => c.passed);
    const failedCount = checks.filter((c) => !c.passed).length;

    await supabase
      .from('run_steps')
      .update({
        status: allPassed ? 'succeeded' : 'failed',
        output: { passed: allPassed, checks, failedCount, totalFiles: checks.length },
        ...(allPassed ? {} : { error: `${failedCount} file(s) failed syntax validation` }),
        ended_at: new Date().toISOString(),
      })
      .eq('id', ctx.stepId);

    // Update run status
    await supabase
      .from('runs')
      .update({
        status: allPassed ? 'succeeded' : 'failed',
        ...(allPassed ? { ended_at: new Date().toISOString() } : { error: `${failedCount} file(s) failed validation`, ended_at: new Date().toISOString() }),
      })
      .eq('id', ctx.runId);

    await supabase
      .from('jobs')
      .update({
        status: allPassed ? 'succeeded' : 'failed',
        ...(allPassed ? {} : { last_error: `${failedCount} file(s) failed validation` }),
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ctx.jobId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .from('run_steps')
      .update({ status: 'failed', error: msg, ended_at: new Date().toISOString() })
      .eq('id', ctx.stepId);

    await supabase
      .from('runs')
      .update({ status: 'failed', error: msg, ended_at: new Date().toISOString() })
      .eq('id', ctx.runId);

    await supabase
      .from('jobs')
      .update({ status: 'failed', last_error: msg, locked_until: null, updated_at: new Date().toISOString() })
      .eq('id', ctx.jobId);
  }
}

function detectLanguageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    css: 'css', scss: 'css', html: 'html', json: 'json',
    py: 'python', sql: 'sql', md: 'markdown', yml: 'yaml', yaml: 'yaml',
  };
  return map[ext] || ext;
}

function validateSyntax(content: string, language: string): { passed: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (language) {
    case 'json':
      try { JSON.parse(content); } catch (e: any) { errors.push(`JSON parse error: ${e.message}`); }
      break;

    case 'typescript':
    case 'tsx':
    case 'javascript':
    case 'jsx':
      checkBraceBalance(content, '{}', 'curly braces', errors);
      checkBraceBalance(content, '()', 'parentheses', errors);
      checkBraceBalance(content, '[]', 'brackets', errors);
      checkStringQuotes(content, errors);
      break;

    case 'css':
    case 'scss':
      checkBraceBalance(content, '{}', 'curly braces', errors);
      break;

    case 'html':
    case 'markdown':
      checkHtmlTagBalance(content, errors);
      break;

    case 'yaml':
    case 'yml':
      // Basic YAML: check no tabs, consistent indentation
      if (/\t/.test(content)) errors.push('YAML should not contain tabs');
      break;

    case 'python':
      // Mixed tabs/spaces check
      if (/\t/.test(content) && /^[ ]{4}/m.test(content)) {
        errors.push('Mixed tabs and spaces');
      }
      break;

    default:
      // No validation for unknown languages
  }

  return { passed: errors.length === 0, errors };
}

function checkBraceBalance(content: string, pair: string, label: string, errors: string[]) {
  const open = pair[0]!;
  const close = pair[1]!;
  let depth = 0;
  let inString: string | null = null;
  let inComment = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;
    const prev = i > 0 ? content[i - 1] : '';

    // Track comments
    if (!inString && ch === '/' && content[i + 1] === '/' && !inComment) {
      inComment = true; // line comment
    }
    if (inComment && ch === '\n') {
      inComment = false;
    }
    if (!inString && ch === '*' && prev === '/' && !inComment) {
      // Block comment start — skip until */
      const end = content.indexOf('*/', i + 1);
      if (end !== -1) { i = end + 1; continue; }
    }

    if (inComment) continue;

    // Track strings
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
    } else if (inString === ch && prev !== '\\') {
      inString = null;
    }

    if (inString) continue;

    if (ch === open) depth++;
    if (ch === close) {
      depth--;
      if (depth < 0) {
        errors.push(`Unmatched '${close}' (extra closing ${label})`);
        depth = 0;
      }
    }
  }

  if (depth > 0) errors.push(`Unmatched '${open}' (${depth} unclosed ${label})`);
}

function checkStringQuotes(content: string, errors: string[]) {
  let inString: string | null = null;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i]!;
    const prev = i > 0 ? content[i - 1] : '';
    if (!inString && (ch === '"' || ch === "'" || ch === '`')) {
      inString = ch;
    } else if (inString === ch && prev !== '\\') {
      inString = null;
    }
  }
  if (inString) errors.push(`Unclosed string (${inString})`);
}

function checkHtmlTagBalance(content: string, errors: string[]) {
  // Self-closing and void elements
  const voidTags = new Set([
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]);

  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;
  const stack: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = tagRegex.exec(content)) !== null) {
    const fullMatch = m[0];
    const tagName = (m[1] || '').toLowerCase();

    if (voidTags.has(tagName)) continue;
    if (fullMatch.endsWith('/>')) continue; // self-closing

    if (fullMatch.startsWith('</')) {
      // Closing tag
      if (stack.length === 0 || stack[stack.length - 1] !== tagName) {
        errors.push(`Mismatched closing tag </${tagName}> (expected </${stack[stack.length - 1] || '?'}>)`);
      } else {
        stack.pop();
      }
    } else {
      // Opening tag
      stack.push(tagName);
    }
  }

  if (stack.length > 0) {
    errors.push(`Unclosed tag${stack.length > 1 ? 's' : ''}: ${stack.map((t) => `<${t}>`).join(', ')}`);
  }
}
