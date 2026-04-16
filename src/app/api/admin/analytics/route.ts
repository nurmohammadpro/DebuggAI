/**
 * Admin Analytics API Route
 *
 * GET: Retrieve platform analytics and metrics
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/admin/analytics - Get analytics data
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d, all

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'all':
        startDate = new Date(0);
        break;
    }

    // Get total users
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get new users in period
    const { count: newUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Get users by plan
    const { data: usersByPlan } = await supabaseAdmin
      .from('profiles')
      .select('plan')
      .gte('created_at', startDate.toISOString());

    const planDistribution = {
      free: usersByPlan?.filter(u => u.plan === 'free').length || 0,
      pro: usersByPlan?.filter(u => u.plan === 'pro').length || 0,
      enterprise: usersByPlan?.filter(u => u.plan === 'enterprise').length || 0,
    };

    // Get total credits spent/earned in period
    const { data: creditTransactions } = await supabaseAdmin
      .from('credit_transactions')
      .select('type, amount')
      .gte('created_at', startDate.toISOString());

    const totalCreditsEarned = creditTransactions
      ?.filter(t => t.type === 'earned')
      .reduce((sum, t) => sum + t.amount, 0) || 0;

    const totalCreditsSpent = creditTransactions
      ?.filter(t => t.type === 'spent')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

    // Get total debug sessions
    const { count: totalDebugSessions } = await supabaseAdmin
      .from('debug_sessions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Get total generations
    const { count: totalGenerations } = await supabaseAdmin
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Get revenue (Pro subscriptions)
    const { data: completedReferrals } = await supabaseAdmin
      .from('referrals')
      .select('credits_earned')
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString());

    const totalReferralCredits = completedReferrals
      ?.reduce((sum, r) => sum + r.credits_earned, 0) || 0;

    // Daily active users (simplified - users who created any session/generation)
    const { data: activeUsersData } = await supabaseAdmin
      .from('generations')
      .select('user_id, created_at')
      .gte('created_at', startDate.toISOString());

    const uniqueActiveUsers = new Set(activeUsersData?.map(u => u.user_id)).size;

    // Get daily stats for chart
    const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 30;
    const dailyStats = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const { count: dailyNewUsers } = await supabaseAdmin
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      const { data: dailyCredits } = await supabaseAdmin
        .from('credit_transactions')
        .select('amount, type')
        .gte('created_at', date.toISOString())
        .lt('created_at', nextDate.toISOString());

      const dailySpent = dailyCredits
        ?.filter(t => t.type === 'spent')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      dailyStats.push({
        date: date.toISOString().split('T')[0],
        newUsers: dailyNewUsers || 0,
        creditsSpent: dailySpent,
      });
    }

    return NextResponse.json({
      summary: {
        totalUsers: totalUsers || 0,
        newUsers: newUsers || 0,
        activeUsers: uniqueActiveUsers,
        totalCreditsEarned,
        totalCreditsSpent,
        totalDebugSessions: totalDebugSessions || 0,
        totalGenerations: totalGenerations || 0,
        totalReferralCredits,
      },
      planDistribution,
      dailyStats,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
