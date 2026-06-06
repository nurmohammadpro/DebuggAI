/**
 * Monitoring Edge Function
 *
 * Provides health status and basic metrics for the DeBuggAI platform.
 * This can be used by uptime monitoring services and internal dashboards.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

serve(async (req) => {
  try {
    const startTime = Date.now();

    // Check if this is a health check or metrics request
    const url = new URL(req.url);
    const isHealthCheck = url.pathname === '/health' || url.pathname === '/';
    const isMetrics = url.pathname === '/metrics';

    // Basic health check
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.floor(process.uptime()) : 0,
    };

    if (isHealthCheck) {
      return new Response(JSON.stringify(health), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Metrics endpoint (requires API key)
    if (isMetrics) {
      const apiKey = req.headers.get('Authorization')?.replace('Bearer ', '');
      const configuredKey = Deno.env.get('MONITORING_API_KEY');
      if (!configuredKey || apiKey !== configuredKey) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Get user count
        const { count: userCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get active sessions in last hour
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count: activeSessions } = await supabase
          .from('generations')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneHourAgo);

        // Get debug sessions in last hour
        const { count: debugSessions } = await supabase
          .from('debug_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneHourAgo);

        const responseTime = Date.now() - startTime;

        const metrics = {
          ...health,
          response_time_ms: responseTime,
          metrics: {
            total_users: userCount || 0,
            active_sessions_last_hour: activeSessions || 0,
            debug_sessions_last_hour: debugSessions || 0,
          },
        };

        return new Response(JSON.stringify(metrics), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            status: 'degraded',
            timestamp: new Date().toISOString(),
            error: 'Database connectivity issue',
          }),
          {
            status: 503,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // Not found
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
