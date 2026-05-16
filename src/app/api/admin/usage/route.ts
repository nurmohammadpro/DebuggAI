/**
 * Admin Usage Reporting API
 *
 * Aggregated usage by tenant, model, and date from ai_usage_ledger.
 * Admin-only access.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdmin();
  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get('days') || 30)));
  const tenantId = url.searchParams.get('tenantId');
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Per-tenant aggregation
  let tenantQuery = supabase
    .from('ai_usage_ledger')
    .select('user_id, model, input_tokens, output_tokens, cost_usd, credits_charged, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(2000);

  if (tenantId) {
    tenantQuery = tenantQuery.eq('user_id', tenantId);
  }

  const { data: ledgerRows, error: ledgerError } = await tenantQuery;

  if (ledgerError) {
    return NextResponse.json({ error: ledgerError.message }, { status: 500 });
  }

  // Aggregate by model
  const modelAgg: Record<string, { tokens_in: number; tokens_out: number; cost: number; credits: number; count: number }> = {};
  let totalCredits = 0;
  let totalCost = 0;

  for (const row of ledgerRows || []) {
    const m = row.model || 'unknown';
    if (!modelAgg[m]) modelAgg[m] = { tokens_in: 0, tokens_out: 0, cost: 0, credits: 0, count: 0 };
    modelAgg[m].tokens_in += row.input_tokens || 0;
    modelAgg[m].tokens_out += row.output_tokens || 0;
    modelAgg[m].cost += Number(row.cost_usd || 0);
    modelAgg[m].credits += row.credits_charged || 0;
    modelAgg[m].count += 1;
    totalCredits += row.credits_charged || 0;
    totalCost += Number(row.cost_usd || 0);
  }

  // Daily credit consumption
  const { data: dailyData, error: dailyError } = await supabase
    .rpc('get_daily_credit_usage', { p_days: days });

  let daily: Array<{ date: string; credits: number; cost: number }> = [];
  if (!dailyError && dailyData) {
    daily = (dailyData as any[]).map((d: any) => ({
      date: d.date,
      credits: Number(d.credits || 0),
      cost: Number(d.cost || 0),
    }));
  }

  if (dailyError || !dailyData) {
    // Fallback: aggregate from ledger in JS
    const dailyMap: Record<string, { credits: number; cost: number }> = {};
    for (const row of ledgerRows || []) {
      const d = new Date(row.created_at).toISOString().slice(0, 10);
      if (!dailyMap[d]) dailyMap[d] = { credits: 0, cost: 0 };
      dailyMap[d].credits += row.credits_charged || 0;
      dailyMap[d].cost += Number(row.cost_usd || 0);
    }
    daily = Object.entries(dailyMap)
      .map(([date, v]) => ({ date, credits: v.credits, cost: v.cost }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return NextResponse.json({
    summary: {
      totalCredits,
      totalCost: Math.round(totalCost * 100) / 100,
      models: Object.entries(modelAgg).map(([model, agg]) => ({
        model,
        tokensIn: agg.tokens_in,
        tokensOut: agg.tokens_out,
        cost: Math.round(agg.cost * 100) / 100,
        credits: agg.credits,
        calls: agg.count,
      })),
    },
    daily,
    rows: (ledgerRows || []).slice(0, 100),
  });
}
