'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import { cn } from '@/lib/utils';
import type { DebugSessionRow } from '@/hooks/queries/use-my-debug-sessions';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';

interface DashboardSidebarProps {
  activeHref: string;
  recentChats: DebugSessionRow[];
  recentProjects: GenerationRow[];
  onNewChatClick: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function DashboardSidebar({
  activeHref,
  recentChats,
  recentProjects,
  onNewChatClick,
  collapsed,
  onToggleCollapsed,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user } = useSessionStore();

  return (
    <aside
      className={cn(
        'border-r border-[var(--border-default)] bg-[var(--bg-secondary)] flex flex-col shrink-0 transition-all duration-200',
        collapsed ? 'w-[68px]' : 'w-[280px]'
      )}
    >
      {/* Header */}
      <div className="h-14 border-b border-[var(--border-default)] flex items-center justify-between px-4">
        {!collapsed && (
          <div className="font-semibold text-[14px] text-[var(--text-primary)]">
            DeBuggAI
          </div>
        )}
        <button
          onClick={onToggleCollapsed}
          className="p-1 rounded-[var(--radius-sm)] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)] transition-all"
          aria-label="Toggle sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <path d="M9 3v18"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-3">
        {/* Navigation */}
        <div className="mb-4">
          {!collapsed && (
            <div className="px-4 mb-2 text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Workspace
            </div>
          )}

          <NavItem
            collapsed={collapsed}
            active={pathname === '/dashboard'}
            icon="⌂"
            label="Dashboard"
            href="/dashboard"
          />
          <NavItem
            collapsed={collapsed}
            active={pathname === '/dashboard/web-builder'}
            icon="⚡"
            label="Web Builder"
            href="/dashboard/web-builder"
          />
          <NavItem
            collapsed={collapsed}
            active={pathname === '/dashboard/debug'}
            icon="🐛"
            label="Debug Session"
            href="/dashboard/debug"
          />
        </div>

        {/* Recent Projects */}
        {!collapsed && recentProjects.length > 0 && (
          <div className="mb-4">
            <div className="px-4 mb-2 text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Recent Projects
            </div>
            {recentProjects.slice(0, 5).map((project) => (
              <RecentProjectItem
                key={project.id}
                project={project}
              />
            ))}
          </div>
        )}

        {/* Debug Sessions */}
        {!collapsed && recentChats.length > 0 && (
          <div className="mb-4">
            <div className="px-4 mb-2 text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
              Debug Sessions
            </div>
            {recentChats.slice(0, 5).map((chat) => (
              <RecentChatItem
                key={chat.id}
                chat={chat}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border-default)]">
        {collapsed ? (
          <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[12px] font-medium">
            {user?.email?.[0].toUpperCase() || 'U'}
          </div>
        ) : (
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2.5 p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[12px] font-medium shrink-0">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                {user?.displayName || user?.email || 'User'}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] capitalize">
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
  icon: string;
  label: string;
  href: string;
}

function NavItem({ collapsed, active, icon, label, href }: NavItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 px-4 py-1.5 text-[13px] rounded-[var(--radius-sm)] transition-all',
        active
          ? 'bg-[var(--bg-tertiary)] font-medium text-[var(--text-primary)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
      )}
    >
      <span className="w-4 h-4 flex items-center justify-center text-[12px] shrink-0">
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
      className="flex items-center gap-2.5 px-4 py-1.5 text-[13px] text-[var(--text-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-tertiary)] transition-all relative group"
    >
      <span className="w-4 h-4 flex items-center justify-center text-[12px] shrink-0">
        📊
      </span>
      <span className="flex-1 min-w-0 truncate">
        {project.description || project.prompt || 'Untitled Project'}
      </span>
      <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
        {timeAgo}
      </span>
      <div className="w-5 h-5 rounded-[var(--radius-sm)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-secondary)]">
        ⋮
      </div>
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
      href={`/dashboard?chat=${chat.id}`}
      className="flex items-center gap-2.5 px-4 py-1.5 text-[13px] text-[var(--text-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-tertiary)] transition-all relative group"
    >
      <span className="w-4 h-4 flex items-center justify-center text-[12px] shrink-0">
        ●
      </span>
      <span className="flex-1 min-w-0 truncate">
        {title}
      </span>
      <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
        {timeAgo}
      </span>
      <div className="w-5 h-5 rounded-[var(--radius-sm)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--bg-secondary)]">
        ⋮
      </div>
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
