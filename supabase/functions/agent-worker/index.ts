/**
 * Agent Worker Edge Function (skeleton)
 *
 * Purpose:
 * - Lease jobs from the DB-backed queue (jobs table) using `lease_jobs(...)`
 * - Mark jobs succeeded/failed
 *
 * Notes:
 * - This function is intended to run with SUPABASE_SERVICE_ROLE_KEY.
 * - Real agent execution (LLM/tool calls) will be added incrementally.
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

    if (body.action === 'lease') {
      const workerId = (body.workerId || '').trim();
      if (!workerId) {
        return new Response(JSON.stringify({ error: 'workerId is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const queue = (body.queue || 'default').trim() || 'default';
      const limit = Math.max(1, Math.min(25, Number(body.limit || 5)));
      const leaseSeconds = Math.max(10, Math.min(3600, Number(body.leaseSeconds || 60)));

      const { data, error } = await supabase.rpc('lease_jobs', {
        p_worker_id: workerId,
        p_queue: queue,
        p_limit: limit,
        p_lease_seconds: leaseSeconds,
      });

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

  // Mark running
  await supabase.from('jobs').update({ status: 'running', updated_at: new Date().toISOString() }).eq('id', jobId);

  if (kind === 'plan') {
    const objective = String(payload?.objective || '').trim();
    const plan = [
      { step: 'Validate inputs and permissions', status: 'pending' },
      { step: 'Gather context (project/thread history)', status: 'pending' },
      { step: 'Produce output (LLM/tool calls)', status: 'pending' },
      { step: 'Persist results + usage ledger', status: 'pending' },
    ];

    if (stepId) {
      await supabase
        .from('run_steps')
        .update({
          status: 'succeeded',
          output: { plan, objective },
          ended_at: new Date().toISOString(),
        })
        .eq('id', stepId);
    }

    await supabase.from('runs').update({ status: 'succeeded', ended_at: new Date().toISOString() }).eq('id', runId);
    await supabase.from('jobs').update({ status: 'succeeded', locked_until: null, updated_at: new Date().toISOString() }).eq('id', jobId);
    return;
  }

  // Unknown job kind
  const msg = `Unknown job kind: ${kind}`;
  if (stepId) {
    await supabase.from('run_steps').update({ status: 'failed', error: msg, ended_at: new Date().toISOString() }).eq('id', stepId);
  }
  await supabase.from('runs').update({ status: 'failed', error: msg, ended_at: new Date().toISOString() }).eq('id', runId);
  await supabase.from('jobs').update({ status: 'failed', last_error: msg, locked_until: null, updated_at: new Date().toISOString() }).eq('id', jobId);
}
