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
          <div className="flex gap-0.5 rounded-[8px] bg-[var(--app-panel)] p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setPeriod(range)}
                className={`rounded-[6px] px-3 py-1.5 text-xs font-normal transition-colors ${
                  period === range
                    ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        }
      />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <AdminStatCard
          title="Total Users"
          value={String(data.summary.totalUsers)}
          change={data.summary.totalUsers > 0 ? Math.round((data.summary.newUsers / data.summary.totalUsers) * 100) : 0}
          icon={<Users className="h-4 w-4" />}
        />
        <AdminStatCard
          title="Active Users"
          value={String(data.summary.activeUsers)}
          icon={<Activity className="h-4 w-4" />}
        />
        <AdminStatCard
          title="Credits Spent"
          value={String(data.summary.totalCreditsSpent)}
          icon={<CreditCard className="h-4 w-4" />}
        />
        <AdminStatCard
          title="Total Generations"
          value={String(data.summary.totalGenerations)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Plan Distribution */}
      <div className="rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl mb-8">
        <h3 className="text-sm font-normal text-[var(--app-text)] mb-4">Plan Distribution</h3>
        <div className="space-y-6">
          <PlanBar
            label="Free"
            count={data.planDistribution.free}
            total={data.summary.totalUsers}
            color="bg-[var(--app-text-dim)]"
          />
          <PlanBar
            label="Pro"
            count={data.planDistribution.pro}
            total={data.summary.totalUsers}
            color="bg-[var(--app-accent)]"
          />
          <PlanBar
            label="Enterprise"
            count={data.planDistribution.enterprise}
            total={data.summary.totalUsers}
            color="bg-[var(--app-purple)]"
          />
        </div>
      </div>

      {/* Daily Activity Chart */}
      <div className="rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl mb-8">
        <h3 className="text-sm font-normal text-[var(--app-text)] mb-4">Daily Activity</h3>
        <div className="h-48 flex items-end gap-1">
          {data.dailyStats.map((stat) => (
            <div
              key={stat.date}
              className="flex-1 bg-[var(--app-accent-soft)] hover:bg-[var(--app-accent)]/20 transition-colors rounded-t relative group"
              style={{
                height: `${Math.max(5, (stat.newUsers / maxNewUsers) * 100)}%`,
              }}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[var(--app-panel-2)] text-[var(--app-text)] text-xs p-2 rounded-[8px] shadow-[var(--shadow-lg)] whitespace-nowrap z-[90] border border-[var(--app-border)]">
                <div>{stat.date}</div>
                <div>{stat.newUsers} new users</div>
                <div>{stat.creditsSpent} credits spent</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between text-xs text-[var(--app-text-dim)]">
          <span>{data.dailyStats[0]?.date}</span>
          <span>{data.dailyStats[data.dailyStats.length - 1]?.date}</span>
        </div>
      </div>

      {/* Quick Link Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
