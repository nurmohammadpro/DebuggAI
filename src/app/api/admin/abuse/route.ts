/**
 * Admin Abuse Monitoring API
 *
 * GET /api/admin/abuse - Get abuse events and statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const supabase = createSupabaseAdmin();

    // Get abuse events from last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: recentAbuse, error } = await supabase
      .from('abuse_events')
      .select(`
        *,
        profiles (
          email
        )
      `)
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Get unique IPs, banned users
    const uniqueIPs = new Set((recentAbuse || []).map((e: any) => e.ip_address)).size;
    const bannedUsers = (recentAbuse || []).filter((e: any) => e.event_type === 'banned').length;

    // Get rate limit stats
    const rateLimitHits = (recentAbuse || []).filter((e: any) => e.event_type === 'rate_limit_hit').length;

    const stats = {
      rate_limits_24h: rateLimitHits,
      unique_ips_24h: uniqueIPs,
      banned_users: bannedUsers,
    };

    const violations = (recentAbuse || []).map((event: any) => ({
      id: event.id,
      ip: event.ip_address || 'Unknown',
      type: event.event_type,
      endpoint: event.endpoint || 'N/A',
      user: event.profiles?.email || 'Unknown',
      frequency: event.metadata?.frequency || 'Single occurrence',
      severity: event.event_type === 'rate_limit_hit' ? 'critical' : 'warning',
      created_at: event.created_at,
    }));

    return NextResponse.json({
      stats,
      violations,
    });
  } catch (error) {
    console.error('Admin abuse API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
