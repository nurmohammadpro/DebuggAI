'use client';

import { useMemo, useState } from 'react';
import {
  Users,
  CreditCard,
  Activity,
  TrendingUp,
  Shield,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="p-6 max-w-6xl">
        <AdminPageHeader
          title="Admin Dashboard"
          description="Monitor and manage your DeBuggAI platform"
          right={
            <Badge className="text-xs px-3 py-1.5 bg-purple/10 text-purple border-purple/20">
              <Shield className="mr-2 h-4 w-4" />
              Admin Access
            </Badge>
          }
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
      <div className="p-6 max-w-6xl">
        <AdminPageHeader title="Admin Dashboard" />
        <AdminError title="No data" message="Analytics returned empty response." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <AdminPageHeader
        title="Admin Dashboard"
        description="Monitor and manage your DeBuggAI platform"
        right={
          <Badge className="text-xs px-3 py-1.5 bg-purple/10 text-purple border-purple/20">
            <Shield className="mr-2 h-4 w-4" />
            Admin Access
          </Badge>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={period === '7d' ? 'default' : 'outline'}
          onClick={() => setPeriod('7d')}
        >
          Last 7 days
        </Button>
        <Button
          variant={period === '30d' ? 'default' : 'outline'}
          onClick={() => setPeriod('30d')}
        >
          Last 30 days
        </Button>
        <Button
          variant={period === '90d' ? 'default' : 'outline'}
          onClick={() => setPeriod('90d')}
        >
          Last 90 days
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <AdminStatCard
          title="Total Users"
          value={String(data.summary.totalUsers)}
          subtitle={`+${data.summary.newUsers} new this period`}
          icon={Users}
          gradient="from-blue-500 to-cyan-500"
        />
        <AdminStatCard
          title="Active Users"
          value={String(data.summary.activeUsers)}
          subtitle="Users with activity"
          icon={Activity}
          gradient="from-green-500 to-emerald-500"
        />
        <AdminStatCard
          title="Credits Spent"
          value={String(data.summary.totalCreditsSpent)}
          subtitle={`${data.summary.totalCreditsEarned} earned`}
          icon={CreditCard}
          gradient="from-yellow-500 to-orange-500"
        />
        <AdminStatCard
          title="Total Generations"
          value={String(data.summary.totalGenerations)}
          subtitle={`${data.summary.totalDebugSessions} debug sessions`}
          icon={TrendingUp}
          gradient="from-purple-500 to-pink-500"
        />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <PlanBar
              label="Free"
              count={data.planDistribution.free}
              total={data.summary.totalUsers}
              color="bg-blue-500"
            />
            <PlanBar
              label="Pro"
              count={data.planDistribution.pro}
              total={data.summary.totalUsers}
              color="bg-green-500"
            />
            <PlanBar
              label="Enterprise"
              count={data.planDistribution.enterprise}
              total={data.summary.totalUsers}
              color="bg-purple-500"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end gap-1">
            {data.dailyStats.map((stat) => (
              <div
                key={stat.date}
                className="flex-1 bg-primary/20 hover:bg-primary/30 transition-colors rounded-t relative group"
                style={{
                  height: `${Math.max(5, (stat.newUsers / maxNewUsers) * 100)}%`,
                }}
              >
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg whitespace-nowrap z-[90] border border-border/40">
                  <div>{stat.date}</div>
                  <div>{stat.newUsers} new users</div>
                  <div>{stat.creditsSpent} credits spent</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span>{data.dailyStats[0]?.date}</span>
            <span>{data.dailyStats[data.dailyStats.length - 1]?.date}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
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

