/**
 * Admin Dashboard Page
 *
 * Main admin dashboard with analytics overview and navigation to other admin features.
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Users,
  CreditCard,
  Settings,
  Activity,
  TrendingUp,
  Loader2,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface AnalyticsData {
  summary: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    totalCreditsEarned: number;
    totalCreditsSpent: number;
    totalDebugSessions: number;
    totalGenerations: number;
    totalReferralCredits: number;
  };
  planDistribution: {
    free: number;
    pro: number;
    enterprise: number;
  };
  dailyStats: Array<{
    date: string;
    newUsers: number;
    creditsSpent: number;
  }>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useSessionStore();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!user?.isAdmin) {
        router.push('/dashboard');
      } else {
        fetchAnalytics();
      }
    }
  }, [isAuthenticated, isLoading, user, router, period]);

  const fetchAnalytics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `/api/admin/analytics?period=${period}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Monitor and manage your DeBuggAI platform
          </p>
        </div>
        <Badge className="text-lg px-4 py-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">
          <Shield className="mr-2 h-4 w-4" />
          Admin Access
        </Badge>
      </div>

      {/* Period Selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          variant={period === '7d' ? 'default' : 'outline'}
          onClick={() => setPeriod('7d')}
          className="transition-all duration-200"
        >
          Last 7 days
        </Button>
        <Button
          variant={period === '30d' ? 'default' : 'outline'}
          onClick={() => setPeriod('30d')}
          className="transition-all duration-200"
        >
          Last 30 days
        </Button>
        <Button
          variant={period === '90d' ? 'default' : 'outline'}
          onClick={() => setPeriod('90d')}
          className="transition-all duration-200"
        >
          Last 90 days
        </Button>
      </div>

      {analytics && (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              title="Total Users"
              value={analytics.summary.totalUsers.toString()}
              subtitle={`+${analytics.summary.newUsers} new this period`}
              icon={Users}
              gradient="from-blue-500 to-cyan-500"
            />
            <StatCard
              title="Active Users"
              value={analytics.summary.activeUsers.toString()}
              subtitle="Users with activity"
              icon={Activity}
              gradient="from-green-500 to-emerald-500"
            />
            <StatCard
              title="Credits Spent"
              value={analytics.summary.totalCreditsSpent.toString()}
              subtitle={`${analytics.summary.totalCreditsEarned} earned`}
              icon={CreditCard}
              gradient="from-yellow-500 to-orange-500"
            />
            <StatCard
              title="Total Generations"
              value={analytics.summary.totalGenerations.toString()}
              subtitle={`${analytics.summary.totalDebugSessions} debug sessions`}
              icon={TrendingUp}
              gradient="from-purple-500 to-pink-500"
            />
          </div>

          {/* Plan Distribution */}
          <Card className="card-elevated mb-8">
            <CardHeader>
              <CardTitle>Plan Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <PlanBar
                  label="Free"
                  count={analytics.planDistribution.free}
                  total={analytics.summary.totalUsers}
                  color="bg-blue-500"
                />
                <PlanBar
                  label="Pro"
                  count={analytics.planDistribution.pro}
                  total={analytics.summary.totalUsers}
                  color="bg-green-500"
                />
                <PlanBar
                  label="Enterprise"
                  count={analytics.planDistribution.enterprise}
                  total={analytics.summary.totalUsers}
                  color="bg-purple-500"
                />
              </div>
            </CardContent>
          </Card>

          {/* Daily Activity Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end gap-1">
                {analytics.dailyStats.map((stat) => (
                  <div
                    key={stat.date}
                    className="flex-1 bg-primary/20 hover:bg-primary/30 transition-colors rounded-t relative group"
                    style={{
                      height: `${Math.max(
                        5,
                        (stat.newUsers / Math.max(...analytics.dailyStats.map(s => s.newUsers))) * 100
                      )}%`,
                    }}
                  >
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg whitespace-nowrap z-10">
                      <div>{stat.date}</div>
                      <div>{stat.newUsers} new users</div>
                      <div>{stat.creditsSpent} credits spent</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-between text-xs text-muted-foreground">
                <span>{analytics.dailyStats[0]?.date}</span>
                <span>{analytics.dailyStats[analytics.dailyStats.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-8">
        <Link href="/admin/monitoring">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                  <Activity className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Monitoring</h3>
                  <p className="text-sm text-muted-foreground">
                    System health and metrics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/users">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">User Management</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage users, plans, and permissions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/credits">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <CreditCard className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Credit Management</h3>
                  <p className="text-sm text-muted-foreground">
                    View transactions and adjust balances
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Platform Settings</h3>
                  <p className="text-sm text-muted-foreground">
                    Configure platform-wide settings
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}

// Helper Components

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
}) {
  return (
    <Card className="group card-elevated">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className={`text-3xl font-bold bg-gradient-to-r ${gradient} bg-clip-text text-transparent`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function PlanBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = (count / total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{count}</span>
          <span className="text-muted-foreground">
            ({percentage.toFixed(1)}%)
          </span>
        </div>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function AdminQuickCard({
  href,
  icon: Icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  };

  return (
    <Link href={href}>
      <Card className="card-elevated cursor-pointer h-full group">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${colors[color]} group-hover:scale-110 transition-transform duration-300`}>
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold group-hover:text-primary transition-colors duration-200">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground truncate">{description}</p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
