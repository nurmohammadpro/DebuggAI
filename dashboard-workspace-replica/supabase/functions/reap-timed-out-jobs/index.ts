/**
 * Reap Timed-Out Jobs Edge Function
 *
 * Periodic job that calls reap_timed_out_jobs() to mark timed-out jobs as failed
 * and add them to the dead-letter queue. Intended to run as a scheduled cron job
 * (Supabase Cron, pg_cron, or external scheduler) every 1-5 minutes.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { data, error } = await supabase.rpc('reap_timed_out_jobs');

    if (error) {
      console.error('reap_timed_out_jobs error:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const reaped = (data as number) ?? 0;
    console.log(`Reaped ${reaped} timed-out jobs`);

    // Also update runs that have all jobs terminal but run is still running
    await supabase.rpc('finalize_stale_runs');

    return new Response(JSON.stringify({ ok: true, reaped }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Reap error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
