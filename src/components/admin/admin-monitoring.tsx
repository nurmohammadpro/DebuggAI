'use client';

import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, XCircle, Loader2, Users, CreditCard, Hammer, Box } from 'lucide-react';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';

interface HealthCheck {
  ok: boolean;
  error?: string;
  configured?: boolean;
}

interface HealthData {
  ok: boolean;
  checks: Record<string, HealthCheck>;
  now: string;
}

interface StatsData {
  stats: {
    users: { total: number; free?: number; pro?: number; enterprise?: number };
    totalCredits: number;
    debugSessions: number;
    builderSessions: number;
    actionDistribution: Record<string, number>;
  };
  recentActivity: Array<{
    id: string;
    actor: string;
    action: string;
    target_type: string;
    created_at: string;
  }>;
}

export function AdminMonitoring() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [healthRes, statsRes] = await Promise.all([
          fetch('/api/admin/health'),
          fetch('/api/admin/stats'),
        ]);

        if (healthRes.ok) setHealth(await healthRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load monitoring data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <AdminRouteGuard>
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" style={{ color: 'var(--app-accent)' }} />
          <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
            System Monitoring
          </h1>
        </div>
        <p className="text-[13px] text-[var(--app-text-muted)] mt-1">
          Real-time system health and usage statistics
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--app-text-dim)]" />
        </div>
      ) : error ? (
        <div className="p-4 rounded-[8px] border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/5">
          <p className="text-[13px] text-[var(--app-danger)]">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Health Status */}
          <section>
            <h2 className="text-[13px] font-medium mb-3 text-[var(--app-text)]">Service Health</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {health?.checks && Object.entries(health.checks).map(([name, check]) => (
                <div
                  key={name}
                  className="p-4 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[var(--app-text)] capitalize">
                      {name.replace('_', ' ')}
                    </span>
                    {check.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-[var(--app-success)]" />
                    ) : (
                      <XCircle className="h-4 w-4 text-[var(--app-danger)]" />
                    )}
                  </div>
                  {check.error && (
                    <p className="text-[11px] text-[var(--app-danger)] mt-1 font-mono">{check.error}</p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Stats Grid */}
          {stats?.stats && (
            <section>
              <h2 className="text-[13px] font-medium mb-3 text-[var(--app-text)]">Usage Overview</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)]">
                  <Users className="h-4 w-4 text-[var(--app-text-dim)] mb-2" />
                  <div className="text-[16px] font-semibold text-[var(--app-text)]">
                    {stats.stats.users.total}
                  </div>
                  <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">Total Users</div>
                </div>
                <div className="p-4 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)]">
                  <CreditCard className="h-4 w-4 text-[var(--app-text-dim)] mb-2" />
                  <div className="text-[16px] font-semibold text-[var(--app-text)]">
                    {stats.stats.totalCredits.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">Total Credits</div>
                </div>
                <div className="p-4 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)]">
                  <Hammer className="h-4 w-4 text-[var(--app-text-dim)] mb-2" />
                  <div className="text-[16px] font-semibold text-[var(--app-text)]">
                    {stats.stats.debugSessions}
                  </div>
                  <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">Debug Sessions</div>
                </div>
                <div className="p-4 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)]">
                  <Box className="h-4 w-4 text-[var(--app-text-dim)] mb-2" />
                  <div className="text-[16px] font-semibold text-[var(--app-text)]">
                    {stats.stats.builderSessions}
                  </div>
                  <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">Builder Sessions</div>
                </div>
              </div>
            </section>
          )}

          {/* Plan Distribution */}
          {stats?.stats.users && (
            <section>
              <h2 className="text-[13px] font-medium mb-3 text-[var(--app-text)]">Plan Distribution</h2>
              <div className="flex gap-3 flex-wrap">
                {Object.entries(stats.stats.users)
                  .filter(([k]) => k !== 'total')
                  .map(([plan, count]) => (
                    <div
                      key={plan}
                      className="px-4 py-2 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]"
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                        {plan}
                      </span>
                      <span className="text-[16px] font-semibold text-[var(--app-text)] ml-3">
                        {count as number}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* Recent Activity */}
          {stats?.recentActivity && stats.recentActivity.length > 0 && (
            <section>
              <h2 className="text-[13px] font-medium mb-3 text-[var(--app-text)]">Recent Activity</h2>
              <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--app-border)]">
                        <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Actor</th>
                        <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Action</th>
                        <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Target</th>
                        <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentActivity.map((event) => (
                        <tr key={event.id} className="border-b border-[var(--app-border)]/50 last:border-0">
                          <td className="px-4 py-2 text-[13px] text-[var(--app-text)]">{event.actor}</td>
                          <td className="px-4 py-2 text-[13px] text-[var(--app-text)]">{event.action}</td>
                          <td className="px-4 py-2 text-[13px] text-[var(--app-text-muted)]">{event.target_type}</td>
                          <td className="px-4 py-2 text-[11px] text-[var(--app-text-dim)]">
                            {new Date(event.created_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
    </AdminRouteGuard>
  );
}
