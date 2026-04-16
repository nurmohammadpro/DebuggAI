/**
 * Admin Monitoring Page
 *
 * System health monitoring and status dashboard.
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowLeft,
  Loader2,
  Clock,
  Zap,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  response_time_ms?: number;
  metrics?: {
    total_users: number;
    active_sessions_last_hour: number;
    debug_sessions_last_hour: number;
  };
  error?: string;
}

export default function AdminMonitoringPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useSessionStore();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!user?.isAdmin) {
        router.push('/dashboard');
      } else {
        fetchHealth();
      }
    }

    let interval: NodeJS.Timeout;
    if (autoRefresh && isAuthenticated && user?.isAdmin) {
      interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, isLoading, user, router, autoRefresh]);

  const fetchHealth = async () => {
    try {
      // Get the monitoring URL from the Supabase functions
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // For now, use a mock response since we need to deploy the function first
      setHealth({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime() || 0),
        response_time_ms: Math.random() * 100 + 50,
        metrics: {
          total_users: 150,
          active_sessions_last_hour: 42,
          debug_sessions_last_hour: 18,
        },
      });
    } catch (error) {
      console.error('Failed to fetch health:', error);
      setHealth({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: 0,
        error: 'Failed to fetch health status',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = () => {
    if (!health) return <Loader2 className="h-5 w-5 animate-spin" />;

    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    if (!health) return 'gray';

    switch (health.status) {
      case 'healthy':
        return 'green';
      case 'degraded':
        return 'amber';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
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
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">System Monitoring</h1>
            <p className="text-muted-foreground mt-1">
              Platform health and performance metrics
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setAutoRefresh(!autoRefresh);
            fetchHealth();
          }}
        >
          <Activity className="h-4 w-4 mr-2" />
          {autoRefresh ? 'Auto-refreshing' : 'Refresh'}
        </Button>
      </div>

      {health && (
        <>
          {/* Status Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">System Status</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusIcon()}
                      <Badge variant={getStatusColor()}>
                        {health.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Uptime</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <span className="text-2xl font-bold">
                        {formatUptime(health.uptime)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {health.response_time_ms && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Response Time
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Zap className="h-5 w-5 text-yellow-500" />
                        <span className="text-2xl font-bold">
                          {health.response_time_ms.toFixed(0)}ms
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {health.metrics && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Total Users
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        <span className="text-2xl font-bold">
                          {health.metrics.total_users}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Activity Metrics */}
          {health.metrics && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Last Hour Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Active Sessions
                      </span>
                      <span className="font-bold text-lg">
                        {health.metrics.active_sessions_last_hour}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (health.metrics.active_sessions_last_hour / 100) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Debug Sessions
                      </span>
                      <span className="font-bold text-lg">
                        {health.metrics.debug_sessions_last_hour}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            (health.metrics.debug_sessions_last_hour / 50) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Last Update */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Last updated: {new Date(health.timestamp).toLocaleString()}</span>
                <Button variant="ghost" size="sm" onClick={fetchHealth}>
                  Refresh now
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
