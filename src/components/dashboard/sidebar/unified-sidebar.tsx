'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import { Activity, Bug, Database, Home, MessageSquarePlus, Plus, Zap } from 'lucide-react';
import type { DebugSessionRow } from '@/hooks/queries/use-my-debug-sessions';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';

interface UnifiedSidebarProps {
  recentChats?: DebugSessionRow[];
  recentProjects?: GenerationRow[];
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  mobile?: boolean;
}

export function UnifiedSidebar({
  recentChats = [],
  recentProjects = [],
  collapsed = false,
  onToggleCollapsed,
  mobile = false,
}: UnifiedSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSessionStore();

  // Check if we're on the dashboard home (not viewing a project)
  const isDashboardHome = pathname === '/dashboard' && !searchParams?.has('project');
  const isWebBuilder = pathname === '/dashboard/web-builder';
  const isDebug = pathname === '/dashboard/debug' || pathname.startsWith('/dashboard/debug/');

  return (
    <aside
      className={`${mobile ? 'flex' : 'hidden md:flex'} shrink-0 flex-col h-full bg-[var(--app-panel)] border-r border-[var(--app-border)] transition-all duration-200 ${
        collapsed ? 'w-[64px]' : 'w-[264px]'
      }`}
    >
      {/* Top Content - Navigation and Recent Items */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="h-12 border-b border-[var(--app-border)] flex items-center justify-between px-3 shrink-0">
          {!collapsed && (
            <Link href="/dashboard" className="font-semibold text-xs text-[var(--app-text)]">
              DeBuggAI
            </Link>
          )}
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="p-1 rounded-[6px] text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text-muted)] transition-all"
              aria-label="Toggle sidebar"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M9 3v18"/>
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 py-2 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 pb-3 grid grid-cols-2 gap-2">
              <Link
                href="/dashboard/home?create=1"
                className="h-8 rounded-[6px] bg-[var(--ds-green)] px-2 text-[11px] font-medium text-[#071006] hover:bg-[var(--ds-green-bright)] transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Project
              </Link>
              <Link
                href="/dashboard/debug"
                className="h-8 rounded-[6px] border border-[var(--app-border)] px-2 text-[11px] font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <MessageSquarePlus className="h-3.5 w-3.5" />
                Chat
              </Link>
            </div>
          )}

          {/* Main Navigation */}
          {!collapsed && (
            <div className="px-3 mb-2 text-[10px] font-medium text-[var(--app-text-dim)] uppercase tracking-wider">
              Workspace
            </div>
          )}

          <NavItem
            collapsed={collapsed}
            active={isDashboardHome}
            icon={<Home className="w-3.5 h-3.5" />}
            label="Dashboard"
            href="/dashboard"
          />
          <NavItem
            collapsed={collapsed}
            active={isWebBuilder}
            icon={<Zap className="w-3.5 h-3.5" />}
            label="Web Builder"
            href="/dashboard/web-builder"
          />
          <NavItem
            collapsed={collapsed}
            active={isDebug}
            icon={<Bug className="w-3.5 h-3.5" />}
            label="Debug Session"
            href="/dashboard/debug"
          />

          {/* Recent Projects */}
          {!collapsed && recentProjects.length > 0 && (
            <div className="mt-4">
              <div className="px-3 mb-2 text-[10px] font-medium text-[var(--app-text-dim)] uppercase tracking-wider">
                Recent Projects
              </div>
              {recentProjects.slice(0, 5).map((project) => (
                <RecentProjectItem key={project.id} project={project} />
              ))}
            </div>
          )}

          {/* Debug Sessions */}
          {!collapsed && recentChats.length > 0 && (
            <div className="mt-4">
              <div className="px-3 mb-2 text-[10px] font-medium text-[var(--app-text-dim)] uppercase tracking-wider">
                Recent Chats
              </div>
              {recentChats.slice(0, 5).map((chat) => (
                <RecentChatItem key={chat.id} chat={chat} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Content - User Profile */}
      <div className="p-3 border-t border-[var(--app-border)] shrink-0">
        {collapsed ? (
          <Link
            href="/dashboard/settings"
            className="w-7 h-7 rounded-[6px] bg-[var(--app-surface)] flex items-center justify-center text-[11px] font-semibold text-[var(--app-text-muted)]"
          >
            {user?.email?.[0].toUpperCase() || 'U'}
          </Link>
        ) : (
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 p-2 rounded-[6px] hover:bg-[var(--app-surface)] transition-all"
          >
            <div className="w-7 h-7 rounded-[6px] bg-[var(--app-surface)] flex items-center justify-center text-[11px] font-semibold text-[var(--app-text-muted)] shrink-0">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[var(--app-text)] truncate">
                {user?.displayName || user?.email || 'User'}
              </div>
              <div className="text-[10px] text-[var(--app-text-dim)] capitalize">
                {user?.plan || 'Free'} Plan
              </div>
            </div>
          </Link>
        )}
      </div>
    </aside>
  );
}

interface NavItemProps {
  collapsed: boolean;
  active: boolean;
  icon: React.ReactNode;
  label: string;
  href: string;
}

function NavItem({ collapsed, active, icon, label, href }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-[6px] transition-all ${
        active
          ? 'bg-[var(--app-surface)] font-medium text-[var(--app-text)]'
          : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]'
      }`}
    >
      <span className="flex items-center justify-center shrink-0">
        {icon}
      </span>
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

interface RecentProjectItemProps {
  project: GenerationRow;
}

function RecentProjectItem({ project }: RecentProjectItemProps) {
  const timeAgo = formatTimeAgo(new Date(project.created_at));

  return (
    <Link
      href={`/dashboard?project=${project.id}`}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--app-text-muted)] rounded-[6px] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-all group"
    >
      <Database className="w-3 h-3 text-[var(--app-text-dim)] shrink-0" />
      <span className="flex-1 min-w-0 truncate">
        {project.description || project.prompt || 'Untitled Project'}
      </span>
      <span className="text-[10px] text-[var(--app-text-dim)] shrink-0">
        {timeAgo}
      </span>
    </Link>
  );
}

interface RecentChatItemProps {
  chat: DebugSessionRow;
}

function RecentChatItem({ chat }: RecentChatItemProps) {
  const timeAgo = formatTimeAgo(new Date(chat.created_at));
  const title = chat.error_message || chat.language || 'Debug Session';

  return (
    <Link
      href={`/dashboard/debug/history?session=${chat.id}`}
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--app-text-muted)] rounded-[6px] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-all group"
    >
      <Activity className="w-3 h-3 text-[var(--app-text-dim)] shrink-0" />
      <span className="flex-1 min-w-0 truncate">
        {title}
      </span>
      <span className="text-[10px] text-[var(--app-text-dim)] shrink-0">
        {timeAgo}
      </span>
    </Link>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
}
