'use client';

import { useMemo, useState } from 'react';
import {
  Users,
  CreditCard,
  Activity,
  TrendingUp,
} from 'lucide-react';

import { AdminStatCard } from '@/components/admin/stat-card';
import { PlanBar } from '@/components/admin/plan-bar';
import { AdminQuickCard } from '@/components/admin/admin-quick-card';
import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminLoading } from '@/components/admin/admin-loading';
import { AdminError } from '@/components/admin/admin-error';
import { useAdminAnalytics } from '@/hooks/queries/use-admin-analytics';

export function AdminDashboard() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const { data, isLoading, error, refetch } = useAdminAnalytics(period, true);

  const maxNewUsers = useMemo(() => {
    const list = data?.dailyStats || [];
    return Math.max(1, ...list.map((s) => s.newUsers));
  }, [data?.dailyStats]);

  if (isLoading) return <AdminLoading />;

  if (error) {
    return (
      <div>
        <AdminPageHeader
          title="Admin Dashboard"
          description="Monitor and manage your DeBuggAI platform"
        />
        <AdminError
          title="Failed to load analytics"
          message={error instanceof Error ? error.message : 'Unknown error'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <AdminPageHeader title="Admin Dashboard" />
        <AdminError title="No data" message="Analytics returned empty response." />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Admin Dashboard"
        description="Monitor and manage your DeBuggAI platform"
        right={
          <div className="flex gap-0.5 rounded bg-[var(--bg-tertiary)] p-0.5">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setPeriod(range)}
                className={`rounded px-2 py-1 text-[11px] font-normal transition-colors ${
                  period === range
                    ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <AdminStatCard
          title="Total Users"
          value={String(data.summary.totalUsers)}
          change={data.summary.totalUsers > 0 ? Math.round((data.summary.newUsers / data.summary.totalUsers) * 100) : 0}
          icon={<Users className="h-3.5 w-3.5" />}
        />
        <AdminStatCard
          title="Active Users"
          value={String(data.summary.activeUsers)}
          icon={<Activity className="h-3.5 w-3.5" />}
        />
        <AdminStatCard
          title="Credits Spent"
          value={String(data.summary.totalCreditsSpent)}
          icon={<CreditCard className="h-3.5 w-3.5" />}
        />
        <AdminStatCard
          title="Total Generations"
          value={String(data.summary.totalGenerations)}
          icon={<TrendingUp className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Plan Distribution */}
      <div className="border border-[var(--border-default)] p-4 mb-6">
        <h3 className="text-xs font-medium text-[var(--text-primary)] mb-3">Plan Distribution</h3>
        <div className="space-y-4">
          <PlanBar
            label="Free"
            count={data.planDistribution.free}
            total={data.summary.totalUsers}
            color="bg-gray-400"
          />
          <PlanBar
            label="Pro"
            count={data.planDistribution.pro}
            total={data.summary.totalUsers}
            color="bg-gray-900"
          />
          <PlanBar
            label="Enterprise"
            count={data.planDistribution.enterprise}
            total={data.summary.totalUsers}
            color="bg-purple-600"
          />
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="border border-[var(--border-default)] p-4 mb-6">
        <h3 className="text-xs font-medium text-[var(--text-primary)] mb-3">Daily Activity</h3>
        <div className="h-40 flex items-end gap-1">
          {data.dailyStats.map((stat) => (
            <div
              key={stat.date}
              className="flex-1 bg-gray-100 hover:bg-gray-200 transition-colors rounded-t relative group"
              style={{
                height: `${Math.max(5, (stat.newUsers / maxNewUsers) * 100)}%`,
              }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[var(--bg-secondary)] text-[var(--text-primary)] text-[10px] p-2 rounded whitespace-nowrap z-[90] border border-[var(--border-default)] shadow-lg">
                <div>{stat.date}</div>
                <div>{stat.newUsers} new users</div>
                <div>{stat.creditsSpent} credits spent</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between text-[10px] text-[var(--text-tertiary)]">
          <span>{data.dailyStats[0]?.date}</span>
          <span>{data.dailyStats[data.dailyStats.length - 1]?.date}</span>
        </div>
      </div>

      {/* Quick Link Cards */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <AdminQuickCard
          href="/dashboard/admin/monitoring"
          icon={Activity}
          title="Monitoring"
          description="System health and metrics"
          color="orange"
        />
        <AdminQuickCard
          href="/dashboard/admin/users"
          icon={Users}
          title="User Management"
          description="Manage users, plans, and permissions"
          color="blue"
        />
        <AdminQuickCard
          href="/dashboard/admin/credits"
          icon={CreditCard}
          title="Credit Management"
          description="View transactions and adjust balances"
          color="green"
        />
        <AdminQuickCard
          href="/dashboard/settings"
          icon={TrendingUp}
          title="Platform Settings"
          description="Workspace and billing settings"
          color="purple"
        />
      </div>
    </div>
  );
}
