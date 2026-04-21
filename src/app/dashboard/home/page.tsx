/**
 * Dashboard Home Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

// Note: the main dashboard route now renders the workspace UI. This page is kept at `/dashboard/home`.

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, Code2, History, Zap, Settings, Gift, ArrowRight, TrendingUp, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useSessionStore } from '@/store/session-store';
import { supabase } from '@/lib/supabase';
import { DashboardStatCard } from '@/components/dashboard/stat-card';
import { DashboardQuickLink } from '@/components/dashboard/quick-link';

export default function DashboardPage() {
  const { user } = useSessionStore();
  const [stats, setStats] = useState({
    debugSessions: 0,
    appsGenerated: 0,
  });

  useEffect(() => {
    // Fetch user stats
    const fetchStats = async () => {
      if (!user) return;

      const { data: debugSessions } = await supabase
        .from('debug_sessions')
        .select('id')
        .eq('user_id', user.id);

      const { data: generations } = await supabase
        .from('generations')
        .select('id')
        .eq('user_id', user.id);

      setStats({
        debugSessions: debugSessions?.length || 0,
        appsGenerated: generations?.length || 0,
      });
    };

    fetchStats();
  }, [user]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="display">
            Welcome back, <span style={{ color: 'var(--ds-green)' }}>{user?.displayName || 'Developer'}</span>
          </h1>
          <p className="text-lg text-text2">
            Debug any code and build production-ready apps with AI
          </p>
        </div>
        <Badge variant="green" pill className="text-sm">
          <Zap className="mr-1.5 h-3.5 w-3.5" />
          <span className="font-semibold">{user?.credits === -1 ? '∞' : user?.credits || 30}</span>
          <span className="text-text3 ml-1">credits</span>
        </Badge>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Debug Card */}
        <Card className="group">
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="p-2 rounded-ds bg-red/10 mr-3" style={{ transition: 'transform 150ms' }}>
                <Bug className="h-5 w-5" style={{ color: 'var(--ds-red)' }} />
              </div>
              Debug Code
            </CardTitle>
            <CardDescription>
              Fix errors in JavaScript, Python, PHP, Go, and more with AI-powered analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/debug">
              <Button className="w-full group/btn" size="lg">
                Start Debugging
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Web Builder Card */}
        <Card className="group">
          <CardHeader>
            <CardTitle className="flex items-center">
              <div className="p-2 rounded-ds bg-blue/10 mr-3" style={{ transition: 'transform 150ms' }}>
                <Code2 className="h-5 w-5" style={{ color: 'var(--ds-blue)' }} />
              </div>
              Web Builder
            </CardTitle>
            <CardDescription>
              Generate complete apps with MERN, Laravel, Django, and other stacks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/web-builder">
              <Button className="w-full group/btn" size="lg">
                Build App
                <Sparkles className="ml-2 h-4 w-4 transition-transform group-hover/btn:rotate-12" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <DashboardStatCard
          title="Total Debug Sessions"
          value={stats.debugSessions.toString()}
          description="Across all languages"
          icon={Bug}
          color="red"
        />
        <DashboardStatCard
          title="Apps Generated"
          value={stats.appsGenerated.toString()}
          description="With Web Builder"
          icon={Code2}
          color="blue"
        />
        <DashboardStatCard
          title="Credits Remaining"
          value={user?.credits === -1 ? '∞' : (user?.credits || 30).toString()}
          description="Free plan resets monthly"
          icon={Zap}
          color="green"
        />
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
          <CardDescription>Access your account settings and features</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          <DashboardQuickLink href="/dashboard/pricing" icon={Zap} label="Upgrade Plan" />
          <DashboardQuickLink href="/dashboard/settings" icon={Settings} label="Settings" />
          <DashboardQuickLink href="/dashboard/referrals" icon={Gift} label="Refer & Earn" />
          <DashboardQuickLink href="/dashboard/debug/history" icon={History} label="Debug History" />
          <DashboardQuickLink href="/dashboard/settings/transactions" icon={TrendingUp} label="Transactions" />
          {user?.isAdmin && (
            <DashboardQuickLink href="/dashboard/admin" icon={Shield} label="Admin Panel" highlight />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
