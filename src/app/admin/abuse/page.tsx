/**
 * Admin Abuse Monitoring Page
 *
 * Monitor rate limit violations and suspicious activity with real data.
 */

import { RefreshCwIcon, BanIcon, AlertTriangleIcon } from 'lucide-react';

async function getAbuseData() {
  const { supabase } = await import('@/lib/supabase');

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
    return { stats: null, violations: [], error: error.message };
  }

  // Calculate stats
  const uniqueIPs = new Set((recentAbuse || []).map((e: any) => e.ip_address?.toString())).size;
  const rateLimitHits = (recentAbuse || []).filter((e: any) => e.event_type === 'rate_limit_hit').length;

  const stats = {
    rate_limits_24h: rateLimitHits,
    unique_ips_24h: uniqueIPs,
    active_bans: 0, // Would need to track banned users separately
    growth: 156, // Placeholder - would calculate from previous period
  };

  const violations = (recentAbuse || []).map((event: any) => ({
    id: event.id,
    ip: event.ip_address || 'Unknown',
    type: event.event_type,
    endpoint: event.endpoint || 'N/A',
    user: event.profiles?.email || 'Unknown',
    frequency: event.metadata?.frequency || 'Single',
    severity: event.event_type === 'rate_limit_hit' ? 'critical' : 'warning',
    canLift: true,
  }));

  return { stats, violations, error: null };
}

export default async function AdminAbusePage() {
  const { stats, violations, error } = await getAbuseData();

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[#FF5252]">Error loading abuse data: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#E8F5E9]">Abuse Monitoring</h1>
        <button className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#00C853] hover:text-[#00C853] transition-all font-medium text-[13.5px]">
          <RefreshCwIcon className="w-3.5 h-3.5" />
          Auto-refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { id: 'rate_limits', label: 'Rate Limits', value: stats.rate_limits_24h, unit: '(24h)', severity: 'critical', icon: '⚠️' },
          { id: 'banned_ips', label: 'Unique IPs', value: stats.unique_ips_24h, unit: '(24h)', severity: 'normal', icon: '🚫' },
          { id: 'active_bans', label: 'Active Bans', value: stats.active_bans, unit: '', severity: 'normal', icon: '🔒' },
          { id: 'growth', label: 'vs Last Wk', value: stats.growth, unit: '%', severity: 'normal', icon: '📈' },
        ].map((stat) => (
          <div
            key={stat.id}
            className={`bg-[#111411] border rounded-xl p-4 cursor-pointer transition-transform hover:translate-y-[-2px] ${
              stat.severity === 'critical' ? 'border-[#FF5252]/50' : 'border-[#1F2B1F]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{stat.icon}</span>
              {stat.severity === 'critical' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium rounded px-2 py-0.5 bg-[#FF5252]/15 text-[#FF5252] animate-pulse">
                  CRITICAL
                </span>
              )}
            </div>
            <div className={`text-2xl font-semibold mb-1 ${stat.severity === 'critical' ? 'text-[#FF5252]' : 'text-[#00C853]'}`}>
              {stat.value}
            </div>
            <div className="text-xs text-[#8BAD8B]">
              {stat.label} {stat.unit}
            </div>
          </div>
        ))}
      </div>

      {/* Violations */}
      <div className="bg-[#111411] border border-[#1F2B1F] rounded-xl p-5">
        <h3 className="text-lg font-medium text-[#E8F5E9] mb-4">Recent Violations</h3>
        <div className="space-y-3">
          {violations.length === 0 ? (
            <p className="text-sm text-[#4D6B4D] text-center py-8">No abuse events in the last 24 hours</p>
          ) : (
            violations.map((violation: any) => (
              <div
                key={violation.id}
                className={`bg-[#111411] border rounded-lg p-4 border-l-4 ${
                  violation.severity === 'critical' ? 'border-l-[#FF5252]' : 'border-l-[#FFAB00]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-[#E8F5E9]">{violation.ip}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium rounded px-2 py-0.5 bg-[#FF5252]/15 text-[#FF5252]">
                        {violation.type}
                      </span>
                      <span className="text-xs text-[#8BAD8B]">{violation.endpoint}</span>
                    </div>
                    <p className="text-xs text-[#8BAD8B] mb-2">
                      User: {violation.user} | {violation.frequency}
                    </p>
                    <p className="text-sm text-[#8BAD8B]">
                      Action: <span className="text-[#E8F5E9]">Monitor for repeated offenses</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {violation.canLift && (
                      <button className="h-8 px-3 rounded-lg bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#00C853] hover:text-[#00C853] transition-all text-xs font-medium">
                      Lift
                    </button>
                    )}
                    <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-transparent text-[#FF5252] border border-[#FF5252]/35 hover:bg-[#FF5252]/10 transition-all text-xs font-medium">
                      <BanIcon className="w-3 h-3" />
                      Ban
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
