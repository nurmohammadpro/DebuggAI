/**
 * Admin Metrics API
 *
 * Aggregated platform metrics: run success rate, avg step latency, credit consumption.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdmin();
  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') || 7)));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Run success rate
  const { count: totalRuns } = await supabase
    .from('runs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since);

  const { count: succeededRuns } = await supabase
    .from('runs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
    .eq('status', 'succeeded');

  const { count: failedRuns } = await supabase
    .from('runs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
    .eq('status', 'failed');

  // Avg step latency (seconds)
  const { data: latencyData } = await supabase
    .from('run_steps')
    .select('started_at, ended_at')
    .gte('ended_at', since)
    .not('ended_at', 'is', null)
    .not('started_at', 'is', null)
    .limit(500);

  let avgLatencyMs = 0;
  if (latencyData?.length) {
    const total = latencyData.reduce((sum, s) => {
      const dur = new Date(s.ended_at!).getTime() - new Date(s.started_at!).getTime();
      return sum + Math.max(0, dur);
    }, 0);
    avgLatencyMs = Math.round(total / latencyData.length);
  }

  // Credit consumption rate (per day)
  const { data: creditData } = await supabase
    .from('credit_transactions')
    .select('amount, created_at')
    .gte('created_at', since)
    .eq('type', 'credit_spent')
    .limit(1000);

  let creditsPerDay = 0;
  if (creditData?.length) {
    const total = creditData.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    creditsPerDay = Math.round(total / days);
  }

  // Active users (users with at least one run in period)
  const { data: activeUsers } = await supabase
    .from('runs')
    .select('user_id')
    .gte('created_at', since);

  const uniqueUsers = new Set((activeUsers || []).map((r: any) => r.user_id)).size;

  return NextResponse.json({
    periodDays: days,
    runs: {
      total: totalRuns || 0,
      succeeded: succeededRuns || 0,
      failed: failedRuns || 0,
      successRate: totalRuns ? Math.round(((succeededRuns || 0) / totalRuns) * 10000) / 100 : 0,
    },
    latency: {
      avgStepMs: avgLatencyMs,
      avgStepSec: Math.round(avgLatencyMs / 10) / 100,
    },
    credits: {
      spentPerDay: creditsPerDay,
      totalSpent: creditData?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0,
    },
    users: {
      active: uniqueUsers,
    },
  });
}
