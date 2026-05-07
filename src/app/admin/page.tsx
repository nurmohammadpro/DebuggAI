/**
 * Admin Dashboard Overview Page
 *
 * Enterprise-grade admin dashboard with real-time metrics, trends, and actionable insights.
 * Styled with V03 design system patterns.
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import {
  BugIcon,
  CoinsIcon,
  Building2Icon,
  UsersIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshCwIcon,
  DownloadIcon,
  FileTextIcon,
} from 'lucide-react';

import { getDashboardStats, getRecentActivity } from '@/lib/admin/auth';

interface DashboardStats {
  totalUsers: number;
  totalCredits: number;
  debugSessions: number;
  builderSessions: number;
}

interface Activity {
  id: string;
  actor: string;
  action: string;
  target_type: string | null;
  metadata: any;
  created_at: string;
}

type TimeRange = '24h' | '7d' | '30d' | '90d';

function formatRelativeTime(date: string) {
  const diffMs = Date.now() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function StatGridCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl transition-colors duration-200 hover:bg-[var(--app-panel-2)]">
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[7px]"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-[22px] font-medium tracking-[-0.03em] text-[var(--app-text)]">
        {value.toLocaleString()}
      </p>
      <p className="mt-1 text-sm font-normal text-[var(--app-text-muted)]">{label}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsResult, activityResult] = await Promise.all([
        getDashboardStats(),
        getRecentActivity(20),
      ]);

      if (statsResult.error || activityResult.error) {
        setError(statsResult.error || activityResult.error || 'Unknown error');
      }

      setStats(statsResult.stats);
      setRecentActivity(activityResult.activities || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  const statCards = [
    { id: 'users', label: 'Total Users', value: stats?.totalUsers || 0, icon: UsersIcon, color: '#40C4FF' },
    { id: 'credits', label: 'Total Credits', value: stats?.totalCredits || 0, icon: CoinsIcon, color: '#FFAB00' },
    { id: 'debug', label: 'Debug Sessions', value: stats?.debugSessions || 0, icon: BugIcon, color: '#00C853' },
    { id: 'builder', label: 'Builder Sessions', value: stats?.builderSessions || 0, icon: Building2Icon, color: '#CE93D8' },
  ];

  const getActivityConfig = (activity: Activity) => {
    const action = activity.action.toLowerCase();
    if (action.includes('ban') || action.includes('delete')) {
      return { icon: AlertCircleIcon, bg: 'bg-[var(--app-danger-soft)]', text: 'text-[var(--app-danger)]' };
    }
    if (action.includes('credit')) {
      return { icon: CheckCircleIcon, bg: 'bg-[var(--app-success-soft)]', text: 'text-[var(--app-success)]' };
    }
    if (action.includes('update') || action.includes('modify')) {
      return { icon: ClockIcon, bg: 'bg-[var(--app-info-soft)]', text: 'text-[var(--app-info)]' };
    }
    return { icon: ClockIcon, bg: 'bg-[var(--app-surface)]', text: 'text-[var(--app-text-muted)]' };
  };

  const exportReport = async () => {
    const report = {
      generatedAt: new Date().toISOString(),
      timeRange,
      stats,
      recentActivity: recentActivity.slice(0, 50),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
            Dashboard Overview
          </h1>
          <p className="mt-1 text-[13px] font-normal text-[var(--app-text-muted)]">
            Real-time metrics and system health monitoring
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex gap-0.5 rounded-[8px] bg-[var(--app-panel)] p-1">
            {(['24h', '7d', '30d', '90d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`rounded-[6px] px-3 py-1.5 text-xs font-normal transition-colors ${
                  timeRange === range
                    ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Auto Refresh */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 rounded-[8px] border-0 px-3 py-1.5 text-xs font-normal transition-colors ${
              autoRefresh
                ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                : 'bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]'
            }`}
          >
            <RefreshCwIcon className={`h-3.5 w-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>

          {/* Export */}
          <button
            onClick={exportReport}
            className="inline-flex items-center gap-1.5 rounded-[8px] border-0 bg-[var(--app-panel)] px-3 py-1.5 text-xs font-normal text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 rounded-[8px] bg-[var(--app-danger-soft)] border border-[var(--app-danger)]/20 p-4">
          <AlertCircleIcon className="h-5 w-5 text-[var(--app-danger)] shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--app-danger)]">Error loading dashboard data</p>
            <p className="text-xs text-[var(--app-danger)]/70 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="rounded-[8px] bg-[var(--app-danger)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <StatGridCard key={stat.id} {...stat} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl">
          <div className="border-b border-[var(--app-border)] px-4 py-3">
            <h3 className="flex items-center gap-2 text-sm font-normal text-[var(--app-text)]">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${autoRefresh ? 'animate-ping bg-[var(--app-success)]' : 'bg-[var(--app-text-dim)]'}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${autoRefresh ? 'bg-[var(--app-success)]' : 'bg-[var(--app-text-dim)]'}`} />
              </span>
              Live Activity
            </h3>
          </div>

          <div className="p-2">
            {loading ? (
              <div className="animate-pulse space-y-2 p-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="h-7 w-7 rounded-xl bg-[var(--app-surface)]" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3.5 w-44 rounded bg-[var(--app-surface)]" />
                      <div className="h-3 w-20 rounded bg-[var(--app-surface)]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-12 text-center">
                <ClockIcon className="mx-auto mb-3 h-10 w-10 text-[var(--app-text-dim)]" />
                <p className="text-sm text-[var(--app-text-muted)]">No recent activity</p>
                <p className="mt-1 text-xs text-[var(--app-text-dim)]">Activity will appear here as users interact with the system</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--app-border)]">
                {recentActivity.slice(0, 15).map((activity) => {
                  const cfg = getActivityConfig(activity);
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={activity.id}
                      className="group flex items-start gap-3 rounded-[8px] px-2 py-2.5 transition-colors hover:bg-[var(--app-surface-subtle)]"
                    >
                      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] ${cfg.bg} ${cfg.text}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-normal text-[var(--app-text)]">
                          {activity.actor}
                        </p>
                        <p className="text-sm text-[var(--app-text-muted)]">
                          {activity.action.replace(/admin\./g, '').replace(/_/g, ' ')}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-xs text-[var(--app-text-dim)]">
                            {formatRelativeTime(activity.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl">
          <div className="border-b border-[var(--app-border)] px-4 py-3">
            <h3 className="text-sm font-normal text-[var(--app-text)]">Quick Actions</h3>
          </div>
          <div className="p-2">
            <a
              href="/admin/users"
              className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-normal text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
            >
              <UsersIcon className="h-4 w-4" />
              <span className="flex-1">Manage Users</span>
            </a>
            <a
              href="/admin/credits"
              className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-normal text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
            >
              <CoinsIcon className="h-4 w-4" />
              <span className="flex-1">View Credits</span>
            </a>
            <a
              href="/admin/abuse"
              className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-normal text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
            >
              <AlertCircleIcon className="h-4 w-4" />
              <span className="flex-1">Review Abuse Reports</span>
            </a>
            <a
              href="/admin/audit"
              className="flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-sm font-normal text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface-subtle)] hover:text-[var(--app-text)]"
            >
              <FileTextIcon className="h-4 w-4" />
              <span className="flex-1">Audit Log</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
