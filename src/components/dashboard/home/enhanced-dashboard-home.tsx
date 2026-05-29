/**
 * Enhanced Dashboard Home Component
 *
 * Comprehensive dashboard with stats, activity feeds, and quick actions
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { useMyThreads } from '@/hooks/queries/use-my-threads';
import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';
import { useSessionStore } from '@/store/session-store';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  FolderKanban,
  Bug,
  MessageSquare,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Settings,
  GitBranch,
  ChevronRight,
  Activity,
} from 'lucide-react';

export function EnhancedDashboardHome() {
  const router = useRouter();
  const { user } = useSessionStore();
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  const { data: projects, isLoading: projectsLoading } = useMyProjects(10, true);
  const { data: threads } = useMyThreads(10, true);
  const { data: debugSessions } = useMyDebugSessions(20, true);

  // Calculate stats
  const totalProjects = projects?.length || 0;
  const totalThreads = threads?.length || 0;
  const totalDebugSessions = debugSessions?.length || 0;

  const recentActivity = [
    ...(projects?.slice(0, 3).map(p => ({
      id: p.id,
      type: 'project' as const,
      title: p.description || p.prompt || 'Untitled Project',
      timestamp: p.updated_at || p.created_at,
      icon: FolderKanban,
    })) || []),
    ...(debugSessions?.slice(0, 2).map(s => ({
      id: s.id,
      type: 'debug' as const,
      title: `Debug Session: ${s.language || 'Unknown'}`,
      timestamp: s.created_at,
      icon: Bug,
    })) || []),
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 5);

  const handleCreateProject = () => {
    router.push('/dashboard/home?create=1');
  };

  const handleStartDebug = () => {
    router.push('/dashboard/debug');
  };

  const handleOpenSettings = () => {
    router.push('/dashboard/settings');
  };

  const handleViewBranches = () => {
    router.push('/dashboard/branches');
  };

  return (
    <div className="min-h-screen bg-[var(--app-bg)] p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--app-text)]">
              Welcome back, {user?.displayName?.split(' ')[0] || 'Developer'}
            </h1>
            <p className="text-sm text-[var(--app-text-muted)] mt-1">
              Here's what's happening with your projects today
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTimeRange('7d')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedTimeRange === '7d'
                  ? 'bg-[var(--app-accent)] text-[#071006]'
                  : 'bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)]'
              }`}
            >
              7D
            </button>
            <button
              onClick={() => setSelectedTimeRange('30d')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedTimeRange === '30d'
                  ? 'bg-[var(--app-accent)] text-[#071006]'
                  : 'bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)]'
              }`}
            >
              30D
            </button>
            <button
              onClick={() => setSelectedTimeRange('90d')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                selectedTimeRange === '90d'
                  ? 'bg-[var(--app-accent)] text-[#071006]'
                  : 'bg-[var(--app-panel)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)]'
              }`}
            >
              90D
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <button
          onClick={handleCreateProject}
          className="group bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-4 text-left hover:border-[var(--app-accent)] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--app-accent-soft)] flex items-center justify-center">
              <Plus className="w-5 h-5 text-[var(--app-accent)]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--app-text-dim)] group-hover:text-[var(--app-accent)] transition-colors" />
          </div>
          <h3 className="text-sm font-medium text-[var(--app-text)] mb-1">New Project</h3>
          <p className="text-xs text-[var(--app-text-muted)]">Create a new project from scratch</p>
        </button>

        <button
          onClick={handleStartDebug}
          className="group bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-4 text-left hover:border-[var(--app-accent)] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--app-warning-soft)] flex items-center justify-center">
              <Bug className="w-5 h-5 text-[var(--app-warning)]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--app-text-dim)] group-hover:text-[var(--app-accent)] transition-colors" />
          </div>
          <h3 className="text-sm font-medium text-[var(--app-text)] mb-1">Debug Code</h3>
          <p className="text-xs text-[var(--app-text-muted)]">Start a new debugging session</p>
        </button>

        <button
          onClick={handleViewBranches}
          className="group bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-4 text-left hover:border-[var(--app-accent)] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--app-info-soft)] flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-[var(--app-info)]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--app-text-dim)] group-hover:text-[var(--app-accent)] transition-colors" />
          </div>
          <h3 className="text-sm font-medium text-[var(--app-text)] mb-1">Branches</h3>
          <p className="text-xs text-[var(--app-text-muted)]">Manage project branches</p>
        </button>

        <button
          onClick={handleOpenSettings}
          className="group bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-4 text-left hover:border-[var(--app-accent)] transition-all"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--app-purple-soft)] flex items-center justify-center">
              <Settings className="w-5 h-5 text-[var(--app-purple)]" />
            </div>
            <ChevronRight className="w-4 h-4 text-[var(--app-text-dim)] group-hover:text-[var(--app-accent)] transition-colors" />
          </div>
          <h3 className="text-sm font-medium text-[var(--app-text)] mb-1">Settings</h3>
          <p className="text-xs text-[var(--app-text-muted)]">Manage your preferences</p>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FolderKanban}
          label="Total Projects"
          value={totalProjects.toString()}
          change="+12%"
          trend="up"
          color="accent"
        />
        <StatCard
          icon={Bug}
          label="Debug Sessions"
          value={totalDebugSessions.toString()}
          change="+8%"
          trend="up"
          color="warning"
        />
        <StatCard
          icon={MessageSquare}
          label="Active Threads"
          value={totalThreads.toString()}
          change="+5%"
          trend="up"
          color="info"
        />
        <StatCard
          icon={Zap}
          label="Credits Remaining"
          value={user?.credits === -1 ? '∞' : user?.credits?.toString() || '0'}
          change={user?.credits === -1 ? 'Unlimited' : 'Stable'}
          trend="neutral"
          color="success"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-[var(--app-text)]">Recent Activity</h2>
          <Activity className="w-5 h-5 text-[var(--app-text-dim)]" />
        </div>

        {recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-[var(--app-text-dim)] mx-auto mb-4" />
            <p className="text-sm text-[var(--app-text-muted)]">No recent activity</p>
            <p className="text-xs text-[var(--app-text-dim)] mt-1">Start creating projects or debugging to see activity here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-panel-2)] transition-colors cursor-pointer"
                  onClick={() => {
                    if (activity.type === 'project') {
                      router.push(`/dashboard?project=${activity.id}`);
                    } else if (activity.type === 'debug') {
                      router.push(`/dashboard/debug?session=${activity.id}`);
                    }
                  }}
                >
                  <div className="w-10 h-10 rounded-lg bg-[var(--app-accent-soft)] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-[var(--app-accent)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--app-text)] truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-[var(--app-text-muted)]">
                      {formatDistanceToNowStrict(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--app-text-dim)]" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Projects Overview */}
        <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--app-text)]">Recent Projects</h3>
            <button
              onClick={() => router.push('/dashboard/home')}
              className="text-xs text-[var(--app-accent)] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {projects?.slice(0, 3).map((project) => (
              <div
                key={project.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-panel-2)] transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard?project=${project.id}`)}
              >
                <div className="w-8 h-8 rounded bg-[var(--app-accent-soft)] flex items-center justify-center">
                  <FolderKanban className="w-4 h-4 text-[var(--app-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--app-text)] truncate">
                    {project.description || project.prompt || 'Untitled Project'}
                  </p>
                  <p className="text-xs text-[var(--app-text-muted)]">
                    {project.stack?.toUpperCase() || 'UNKNOWN'}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--app-text-dim)]" />
              </div>
            ))}
            {(!projects || projects.length === 0) && (
              <p className="text-xs text-[var(--app-text-muted)] text-center py-4">No projects yet</p>
            )}
          </div>
        </div>

        {/* Debug Sessions Overview */}
        <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-[var(--app-text)]">Debug Sessions</h3>
            <button
              onClick={() => router.push('/dashboard/debug')}
              className="text-xs text-[var(--app-accent)] hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-3">
            {debugSessions?.slice(0, 3).map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-[var(--app-surface)] hover:bg-[var(--app-panel-2)] transition-colors cursor-pointer"
                onClick={() => router.push(`/dashboard/debug?session=${session.id}`)}
              >
                <div className="w-8 h-8 rounded bg-[var(--app-warning-soft)] flex items-center justify-center">
                  <Bug className="w-4 h-4 text-[var(--app-warning)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--app-text)] truncate">
                    {session.language || 'Unknown'} Debugging
                  </p>
                  <p className="text-xs text-[var(--app-text-muted)]">
                    {formatDistanceToNowStrict(new Date(session.created_at), { addSuffix: true })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--app-text-dim)]" />
              </div>
            ))}
            {(!debugSessions || debugSessions.length === 0) && (
              <p className="text-xs text-[var(--app-text-muted)] text-center py-4">No debug sessions yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  color: 'accent' | 'warning' | 'info' | 'success';
}

function StatCard({ icon: Icon, label, value, change, trend, color }: StatCardProps) {
  const colorMap = {
    accent: 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]',
    warning: 'bg-[var(--app-warning-soft)] text-[var(--app-warning)]',
    info: 'bg-[var(--app-info-soft)] text-[var(--app-info)]',
    success: 'bg-[var(--app-success-soft)] text-[var(--app-success)]',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingUp : Clock;
  const trendColor = trend === 'up' ? 'text-[var(--app-success)]' : trend === 'down' ? 'text-[var(--app-danger)]' : 'text-[var(--app-text-muted)]';

  return (
    <div className="bg-[var(--app-panel)] border border-[var(--app-border)] rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${colorMap[color]} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
          {trend !== 'neutral' && <TrendIcon className="w-3 h-3" />}
          <span>{change}</span>
        </div>
      </div>
      <div className="text-2xl font-semibold text-[var(--app-text)] mb-1">{value}</div>
      <div className="text-xs text-[var(--app-text-muted)]">{label}</div>
    </div>
  );
}