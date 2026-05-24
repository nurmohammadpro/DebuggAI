/**
 * Admin Dashboard Stats API
 *
 * GET /api/admin/stats - Get dashboard statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const supabase = createSupabaseAdmin();

    // Get user counts by plan
    const { data: userCounts } = await supabase
      .from('profiles')
      .select('plan_type');

    const userStats = (userCounts || []).reduce((acc: any, user: any) => {
      acc[user.plan_type] = (acc[user.plan_type] || 0) + 1;
      acc.total = (acc.total || 0) + 1;
      return acc;
    }, {});

    // Get total credits
    const { data: wallets } = await supabase
      .from('credit_wallets')
      .select('balance');

    const totalCredits = (wallets || []).reduce((sum: number, w: any) => sum + w.balance, 0);

    // Get session counts
    const { count: debugSessions } = await supabase
      .from('debug_sessions')
      .select('*', { count: 'exact', head: true });

    const { count: builderSessions } = await supabase
      .from('web_builder_sessions')
      .select('*', { count: 'exact', head: true });

    // Get recent activity (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: rateLimitHits24h } = await supabase
      .from('audit_events')
      .select('id', { count: 'exact', head: true })
      .eq('action', 'rate_limit.hit')
      .gte('created_at', oneDayAgo);

    const { data: recentAudit } = await supabase
      .from('audit_events')
      .select('*, profiles(email)')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get action type distribution
    const { data: sessionActions } = await supabase
      .from('debug_sessions')
      .select('action_type');

    const actionDistribution = (sessionActions || []).reduce((acc: any, session: any) => {
      acc[session.action_type] = (acc[session.action_type] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      stats: {
        users: userStats,
        totalCredits,
        debugSessions: debugSessions || 0,
        builderSessions: builderSessions || 0,
        rateLimitHits24h: rateLimitHits24h || 0,
        actionDistribution,
      },
      recentActivity: (recentAudit || []).map((event: any) => ({
        id: event.id,
        actor: event.profiles?.email || 'System',
        action: event.action,
        target_type: event.target_type,
        metadata: event.metadata,
        created_at: event.created_at,
      })),
    });
  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
