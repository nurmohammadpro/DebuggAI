/**
 * Admin Analytics API Route
 *
 * GET: Retrieve platform analytics and metrics
 */

import { NextResponse, type NextRequest } from 'next/server';
import { eachDayOfInterval, formatISO, startOfDay, subDays } from 'date-fns';

import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const supabaseAdmin = createSupabaseAdmin();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d, all

    const dayCount = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const startDate =
      period === 'all' ? null : startOfDay(subDays(new Date(), dayCount));

    const startIso = startDate ? startDate.toISOString() : null;
    const startIsoOrEpoch = startIso || '1970-01-01T00:00:00.000Z';

    const safeCount = async (table: string) => {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('id', { count: 'exact', head: true });
        if (error) return 0;
        return count || 0;
      } catch {
        return 0;
      }
    };

    const safeCountSince = async (table: string, column = 'created_at') => {
      try {
        const { count, error } = await supabaseAdmin
          .from(table)
          .select('id', { count: 'exact', head: true })
          .gte(column, startIsoOrEpoch);
        if (error) return 0;
        return count || 0;
      } catch {
        return 0;
      }
    };

    const [totalUsers, totalDebugSessions, totalGenerations, newUsers] =
      await Promise.all([
        safeCount('profiles'),
        safeCountSince('debug_sessions'),
        safeCountSince('generations'),
        safeCountSince('profiles'),
      ]);

    // Plan distribution (best-effort; safe on small datasets)
    let planDistribution = { free: 0, pro: 0, enterprise: 0 };
    try {
      const { data } = await supabaseAdmin
        .from('profiles')
        .select('plan')
        .limit(10000);
      for (const row of data || []) {
        const plan = (row as any)?.plan;
        if (plan === 'pro') planDistribution.pro += 1;
        else if (plan === 'enterprise') planDistribution.enterprise += 1;
        else planDistribution.free += 1;
      }
    } catch {
      planDistribution = { free: 0, pro: 0, enterprise: 0 };
    }

    // Transactions within period for credit totals + daily stats
    let totalCreditsEarned = 0;
    let totalCreditsSpent = 0;
    let totalReferralCredits = 0;
    let activeUsers = 0;

    const dailyStats =
      period === 'all'
        ? []
        : eachDayOfInterval({
            start: startDate!,
            end: startOfDay(new Date()),
          }).map((d) => ({
            date: formatISO(d, { representation: 'date' }),
            newUsers: 0,
            creditsSpent: 0,
          }));

    try {
      const [{ data: txs }, { data: userRows }, { data: generationUsers }, { data: debugUsers }] =
        await Promise.all([
          supabaseAdmin
            .from('credit_transactions')
            .select('amount, description, created_at')
            .gte('created_at', startIsoOrEpoch)
            .limit(20000),
          supabaseAdmin
            .from('profiles')
            .select('created_at')
            .gte('created_at', startIsoOrEpoch)
            .limit(20000),
          supabaseAdmin
            .from('generations')
            .select('user_id, created_at')
            .gte('created_at', startIsoOrEpoch)
            .limit(20000),
          supabaseAdmin
            .from('debug_sessions')
            .select('user_id, created_at')
            .gte('created_at', startIsoOrEpoch)
            .limit(20000),
        ]);

      // Active users = unique users with activity (generations OR debug_sessions) in period
      const active = new Set<string>();
      for (const row of generationUsers || []) active.add((row as any).user_id);
      for (const row of debugUsers || []) active.add((row as any).user_id);
      activeUsers = active.size;

      const dailyIndex = new Map<string, { newUsers: number; creditsSpent: number }>();
      for (const d of dailyStats) dailyIndex.set(d.date, d);

      for (const row of userRows || []) {
        const date = String((row as any).created_at || '').slice(0, 10);
        const bucket = dailyIndex.get(date);
        if (bucket) bucket.newUsers += 1;
      }

      for (const row of txs || []) {
        const amt = Number((row as any).amount) || 0;
        if (amt > 0) totalCreditsEarned += amt;
        if (amt < 0) totalCreditsSpent += Math.abs(amt);
        if ((row as any).source === 'referral') {
          if (amt > 0) totalReferralCredits += amt;
        }

        const date = String((row as any).created_at || '').slice(0, 10);
        const bucket = dailyIndex.get(date);
        if (bucket && amt < 0) bucket.creditsSpent += Math.abs(amt);
      }
    } catch {
      // Leave as zeros
    }

    return NextResponse.json({
      summary: {
        totalUsers,
        newUsers,
        activeUsers,
        totalCreditsEarned,
        totalCreditsSpent,
        totalDebugSessions,
        totalGenerations,
        totalReferralCredits,
      },
      planDistribution,
      dailyStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
