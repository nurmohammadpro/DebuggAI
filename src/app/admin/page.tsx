/**
 * Admin Dashboard Overview Page
 *
 * Enterprise-grade admin dashboard with real-time metrics, trends, and actionable insights.
 */

'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { BugIcon, CoinsIcon, Building2Icon, UsersIcon, AlertCircleIcon, CheckCircleIcon, ClockIcon, RefreshCwIcon, DownloadIcon, FileTextIcon } from 'lucide-react';
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

    const interval = setInterval(fetchDashboardData, 30000); // 30 seconds
    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  const statCards = [
    {
      id: 'users',
      label: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: UsersIcon,
      color: '#40C4FF',
    },
    {
      id: 'credits',
      label: 'Total Credits',
      value: stats?.totalCredits || 0,
      icon: CoinsIcon,
      color: '#FFAB00',
    },
    {
      id: 'debug',
      label: 'Debug Sessions',
      value: stats?.debugSessions || 0,
      icon: BugIcon,
      color: '#00C853',
    },
    {
      id: 'builder',
      label: 'Builder Sessions',
      value: stats?.builderSessions || 0,
      icon: Building2Icon,
      color: '#CE93D8',
    },
  ];

  const getActivityType = (activity: Activity) => {
    const action = activity.action.toLowerCase();
    if (action.includes('ban') || action.includes('delete')) return 'critical';
    if (action.includes('credit')) return 'success';
    if (action.includes('update') || action.includes('modify')) return 'info';
    return 'default';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'critical': return AlertCircleIcon;
      case 'success': return CheckCircleIcon;
      case 'info': return ClockIcon;
      default: return ClockIcon;
    }
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8F5E9]">Dashboard Overview</h1>
          <p className="text-sm text-[#4D6B4D] mt-1">
            Real-time metrics and system health monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Selector */}
          <div className="inline-flex items-center bg-[#111411] border border-[#1F2B1F] rounded-md p-1">
            {(['24h', '7d', '30d', '90d'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  timeRange === range
                    ? 'bg-[#00C853] text-black'
                    : 'text-[#8BAD8B] hover:text-[#E8F5E9]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-full border transition-all font-medium text-[13.5px] ${
              autoRefresh
                ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30'
                : 'bg-transparent text-[#E8F5E9] border-[#283228] hover:border-[#00C853] hover:text-[#00C853]'
            }`}
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            {autoRefresh ? 'Auto-refreshing' : 'Auto-refresh'}
          </button>

          {/* Export Button */}
          <button
            onClick={exportReport}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#00C853] hover:text-[#00C853] transition-all font-medium text-[13.5px]"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-[#FF5252]/10 border border-[#FF5252]/30 rounded-ds-xl">
          <AlertCircleIcon className="w-5 h-5 text-[#FF5252] flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#FF5252]">Error loading dashboard data</p>
            <p className="text-xs text-[#FF5252]/80 mt-0.5">{error}</p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-[#FF5252] text-black hover:bg-[#FF7B7B] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.id}
              className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-5 cursor-pointer transition-all hover:translate-y-[-2px] hover:border-[#283228] group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                    <Icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <span className="text-xs uppercase tracking-wider text-[#4D6B4D]">{stat.label}</span>
                </div>
              </div>

              <div className="text-3xl font-semibold text-[#E8F5E9] mb-1">
                {stat.value.toLocaleString()}
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-[#4D6B4D]">Total all time</span>
                <span className="text-[#8BAD8B] group-hover:text-[#00C853] transition-colors">
                  View details →
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Activity Feed - Takes 2 columns */}
        <div className="lg:col-span-2 bg-[#111411] border border-[#1F2B1F] rounded-ds-xl">
          <div className="p-5 border-b border-[#1F2B1F]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-[#E8F5E9]">Live Activity</h3>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${
                  autoRefresh
                    ? 'bg-[#00C853]/15 text-[#00C853]'
                    : 'bg-[#283228] text-[#8BAD8B]'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${autoRefresh ? 'bg-[#00C853] animate-pulse' : 'bg-[#4D6B4D]'}`} />
                  {autoRefresh ? 'Live' : 'Paused'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5">
            {recentActivity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ClockIcon className="w-12 h-12 text-[#4D6B4D] mb-3" />
                <p className="text-sm text-[#8BAD8B]">No recent activity</p>
                <p className="text-xs text-[#4D6B4D] mt-1">Activity will appear here as users interact with the system</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentActivity.slice(0, 15).map((activity) => {
                  const type = getActivityType(activity);
                  const Icon = getActivityIcon(type);

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-md hover:bg-[#171C17] transition-colors group"
                    >
                      <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                        type === 'critical'
                          ? 'bg-[#FF5252]/15'
                          : type === 'success'
                          ? 'bg-[#00C853]/15'
                          : type === 'info'
                          ? 'bg-[#40C4FF]/15'
                          : 'bg-[#283228]'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          type === 'critical'
                            ? 'text-[#FF5252]'
                            : type === 'success'
                            ? 'text-[#00C853]'
                            : type === 'info'
                            ? 'text-[#40C4FF]'
                            : 'text-[#8BAD8B]'
                        }`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-[#E8F5E9] truncate">
                            {activity.actor}
                          </span>
                          <span className="text-xs text-[#4D6B4D]">•</span>
                          <span className="text-xs text-[#4D6B4D]">
                            {formatRelativeTime(activity.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-[#8BAD8B] break-words">
                          {activity.action.replace(/admin\./g, '').replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-5">
          <h3 className="text-lg font-medium text-[#E8F5E9] mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <a href="/admin/users" className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-left text-sm text-[#E8F5E9] hover:bg-[#171C17] transition-colors border border-transparent hover:border-[#1F2B1F]">
              <UsersIcon className="w-4 h-4 text-[#8BAD8B]" />
              <span className="flex-1">Manage Users</span>
              <span className="text-xs text-[#4D6B4D]">→</span>
            </a>
            <a href="/admin/credits" className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-left text-sm text-[#E8F5E9] hover:bg-[#171C17] transition-colors border border-transparent hover:border-[#1F2B1F]">
              <CoinsIcon className="w-4 h-4 text-[#8BAD8B]" />
              <span className="flex-1">View Credits</span>
              <span className="text-xs text-[#4D6B4D]">→</span>
            </a>
            <a href="/admin/abuse" className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-left text-sm text-[#E8F5E9] hover:bg-[#171C17] transition-colors border border-transparent hover:border-[#1F2B1F]">
              <AlertCircleIcon className="w-4 h-4 text-[#8BAD8B]" />
              <span className="flex-1">Review Abuse Reports</span>
              <span className="text-xs text-[#4D6B4D]">→</span>
            </a>
            <a href="/admin/audit" className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-left text-sm text-[#E8F5E9] hover:bg-[#171C17] transition-colors border border-transparent hover:border-[#1F2B1F]">
              <FileTextIcon className="w-4 h-4 text-[#8BAD8B]" />
              <span className="flex-1">Audit Log</span>
              <span className="text-xs text-[#4D6B4D]">→</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
