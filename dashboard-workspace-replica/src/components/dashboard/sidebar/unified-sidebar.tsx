'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import { Activity, Bug, Database, GitBranch, Home, MessageSquarePlus, Pencil, Plus, Trash2, X, Zap, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';
import type { ThreadRow } from '@/hooks/queries/use-my-threads';
import { getSession } from '@/hooks/use-session';
import { csrfHeader } from '@/lib/csrf-client';
import { useGenerationStore } from '@/store/generation-store';
import { Panel } from '@/components/panel/panel';
import { useConfirmDialog } from '@/components/admin/confirm-dialog';
import { useQueryClient } from '@tanstack/react-query';

interface UnifiedSidebarProps {
  recentThreads?: ThreadRow[];
  recentProjects?: GenerationRow[];
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  /** Mobile overlay state — parent controls this via the header hamburger button */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function UnifiedSidebar({
  recentThreads = [],
  recentProjects = [],
  collapsed = false,
  onToggleCollapsed,
  mobileOpen = false,
  onMobileClose,
}: UnifiedSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useSessionStore();
  const { setThreadId, clearThread } = useGenerationStore();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const queryClient = useQueryClient();

  // Check if we're on the dashboard home (not viewing a project)
  const isDashboardHome = pathname === '/dashboard' && !searchParams?.has('project');
  const isWebBuilder = pathname === '/dashboard/web-builder';
  const isDebug = pathname === '/dashboard/debug' || pathname.startsWith('/dashboard/debug/');
  const isRuns = pathname === '/dashboard/runs' || pathname.startsWith('/dashboard/runs/');
  const activeProjectId = searchParams?.get('project');

  const createThread = async () => {
    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;

    const res = await fetch('/api/threads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...csrfHeader() },
      body: JSON.stringify({ title: null, projectId: activeProjectId || null, workspaceId: null, metadata: { source: 'sidebar' } }),
    });
    if (!res.ok) return;
    const j = await res.json().catch(() => ({}));
    const id = j?.thread?.id as string | undefined;
    if (!id) return;
    setThreadId(id);

    if (activeProjectId) router.push(`/dashboard?project=${activeProjectId}&thread=${id}`);
    else router.push(`/dashboard?thread=${id}`);
  };

  const sidebarContent = (
    <>
      {/* Top Content - Navigation and Recent Items */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Header - v0 style with better visual hierarchy */}
        <div className="h-16 flex items-center justify-between px-3 shrink-0 border-b border-[var(--app-border)]">
          {!collapsed && (
            <Link href="/dashboard" className="font-bold text-sm text-[var(--app-text)] tracking-tight hover:text-[var(--ds-green)] transition-colors">
              DeBuggAI
            </Link>
          )}
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="p-1.5 rounded-[6px] text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-all duration-200"
              aria-label="Toggle sidebar"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {/* On desktop in the inline sidebar show the collapse/expand icon; on mobile overlay show X */}
              <X className="h-4 w-4 md:hidden" />
              <svg className="hidden md:block" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
              </svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex-1 min-h-0 py-2 overflow-y-auto">
          {!collapsed && (
            <div className="px-3 py-3 grid grid-cols-2 gap-2">
              <Link
                href="/dashboard/home?create=1"
                className="h-9 rounded-[6px] bg-[var(--ds-green)] px-3 text-[11px] font-semibold text-white hover:bg-[var(--ds-green-bright)] active:scale-95 transition-all duration-150 inline-flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4" />
                Project
              </Link>
              <Link
                href="/dashboard/debug"
                className="h-9 rounded-[6px] border border-[var(--app-border)] px-3 text-[11px] font-semibold text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] hover:border-[var(--app-border-strong)] transition-all duration-150 inline-flex items-center justify-center gap-1.5"
              >
                <MessageSquarePlus className="h-4 w-4" />
                Chat
              </Link>
            </div>
          )}

          {/* Main Navigation */}
          {!collapsed && (
            <div className="px-3 mt-4 mb-3 text-[10px] font-bold text-[var(--app-text-dim)] uppercase tracking-widest">
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
            active={isRuns}
            icon={<ListChecks className="w-3.5 h-3.5" />}
            label="Runs"
            href="/dashboard/runs"
          />
          <NavItem
            collapsed={collapsed}
            active={isDebug}
            icon={<Bug className="w-3.5 h-3.5" />}
            label="Debug Tracer"
            href="/dashboard/debug"
          />
          <NavItem
            collapsed={collapsed}
            active={pathname === '/dashboard/branches'}
            icon={<GitBranch className="w-3.5 h-3.5" />}
            label="Branches"
            href="/dashboard/branches"
          />

          {/* Recent Projects */}
          {!collapsed && recentProjects.length > 0 && (
            <div className="mt-6">
              <div className="px-3 mb-3 text-[10px] font-bold text-[var(--app-text-dim)] uppercase tracking-widest">
                Recent Projects
              </div>
              {recentProjects.slice(0, 5).map((project) => (
                <RecentProjectItem key={project.id} project={project} />
              ))}
            </div>
          )}

          {/* Debug Sessions */}
          {!collapsed && (
            <div className="mt-6">
              <div className="px-3 mb-3 flex items-center justify-between gap-2">
                <div className="text-[10px] font-bold text-[var(--app-text-dim)] uppercase tracking-widest">
                  Threads
                </div>
                <button
                  onClick={createThread}
                  className="h-7 w-7 rounded-[6px] inline-flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all duration-150"
                  aria-label="New thread"
                  title="Create new thread"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {recentThreads.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-[var(--app-text-dim)]">
                  No threads yet.
                </div>
              ) : (
                recentThreads.slice(0, 10).map((thread) => (
                  <RecentThreadItem
                    key={thread.id}
                    thread={thread}
                    onRename={async () => {
                      const next = window.prompt('Rename thread', (thread.title || '').trim() || 'New thread');
                      if (next == null) return;
                      const session = await getSession();
                      const token = session.session?.access_token;
                      if (!token) return;
                      await fetch(`/api/threads/${thread.id}`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...csrfHeader() },
                        body: JSON.stringify({ title: next }),
                      });
                      router.refresh();
                    }}
                    onDelete={async () => {
                      const ok = await confirm('Delete thread?', 'This cannot be undone.', { confirmText: 'Delete', variant: 'destructive' });
                      if (!ok) return;
                      const session = await getSession();
                      const token = session.session?.access_token;
                      if (!token) return;
                      const res = await fetch(`/api/threads/${thread.id}`, {
                        method: 'DELETE',
                        headers: { Authorization: `Bearer ${token}`, ...csrfHeader() },
                      });
                      if (!res.ok) {
                        toast.error('Failed to delete thread');
                        return;
                      }
                      toast.success('Thread deleted');
                      await queryClient.refetchQueries({ queryKey: ['threads', 'mine'] });
                      if (searchParams?.get('thread') === thread.id) {
                        clearThread();
                        if (activeProjectId) router.push(`/dashboard?project=${activeProjectId}`);
                        else router.push('/dashboard');
                      }
                    }}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Content - User Profile */}
      <div className="p-3 shrink-0 border-t border-[var(--app-border)]">
        {collapsed ? (
          <Link
            href="/dashboard/settings"
            className="w-9 h-9 rounded-[6px] bg-[var(--ds-green)] flex items-center justify-center text-[11px] font-bold text-white hover:bg-[var(--ds-green-bright)] transition-all duration-150 shadow-sm"
            title={user?.email || 'User settings'}
          >
            {user?.email?.[0].toUpperCase() || 'U'}
          </Link>
        ) : (
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2 p-2.5 rounded-[6px] hover:bg-[var(--app-surface)] transition-all duration-150"
          >
            <div className="w-8 h-8 rounded-[6px] bg-[var(--ds-green)] flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[var(--app-text)] truncate">
                {user?.displayName || user?.email || 'User'}
              </div>
              <div className="text-[10px] text-[var(--app-text-dim)] capitalize">
                {user?.plan || 'Free'} Plan
              </div>
            </div>
          </Link>
        )}
      </div>
    </>
  );

  return (
    <>
      <ConfirmDialogComponent />
      {/* Desktop sidebar — full viewport height with v0-style border */}
      <aside
        className={`hidden md:flex shrink-0 flex-col h-full bg-[var(--app-panel)] border-r border-[var(--app-border)] transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-72'
        }`}
      >
          {sidebarContent}
        </aside>

      {/* Mobile overlay — rendered inside a Panel that handles scrim + animation */}
      <Panel
        id="main-sidebar"
        side="left"
        mobile
        mobileOpen={mobileOpen}
        onMobileClose={onMobileClose}
      >
        <div className="flex flex-col h-full bg-[var(--app-panel)]">
          {sidebarContent}
        </div>
      </Panel>
    </>
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
      className={`flex items-center gap-3 px-3 py-2 text-xs rounded-[6px] transition-all duration-150 ${
        active
          ? 'bg-[var(--ds-green-muted)] font-semibold text-[var(--ds-green)] border border-[var(--ds-green)]/20'
          : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
      }`}
    >
      <span className="flex items-center justify-center shrink-0 w-4 h-4">
        {icon}
      </span>
      {!collapsed && <span className="flex-1">{label}</span>}
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
      className="flex items-center gap-2.5 px-2.5 py-2 text-xs text-[var(--app-text-muted)] rounded-[6px] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-all duration-150 group"
    >
      <Database className="w-3.5 h-3.5 text-[var(--app-text-dim)] shrink-0" />
      <span className="flex-1 min-w-0 truncate font-medium">
        {project.description || project.prompt || 'Untitled Project'}
      </span>
      <span className="text-[10px] text-[var(--app-text-dim)] shrink-0 ml-1">
        {timeAgo}
      </span>
    </Link>
  );
}

interface RecentThreadItemProps {
  thread: ThreadRow;
  onRename?: () => void;
  onDelete?: () => void;
}

function RecentThreadItem({ thread, onRename, onDelete }: RecentThreadItemProps) {
  const timeAgo = formatTimeAgo(new Date(thread.updated_at || thread.created_at));
  const title = (thread.title || '').trim() || 'New thread';
  const href = thread.project_id
    ? `/dashboard?project=${thread.project_id}&thread=${thread.id}`
    : `/dashboard?thread=${thread.id}`;

  return (
    <div className="group flex items-center gap-1 px-1 py-0.5">
      <Link
        href={href}
        className="flex-1 flex items-center gap-2 px-2.5 py-2 text-xs text-[var(--app-text-muted)] rounded-[6px] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-all duration-150 min-w-0"
      >
        <Activity className="w-3.5 h-3.5 text-[var(--app-text-dim)] shrink-0" />
        <span className="flex-1 min-w-0 truncate font-medium">{title}</span>
        <span className="text-[10px] text-[var(--app-text-dim)] shrink-0 ml-1">{timeAgo}</span>
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRename?.();
        }}
        className="hidden group-hover:inline-flex h-7 w-7 rounded-[6px] items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all duration-150"
        aria-label="Rename thread"
        title="Rename"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete?.();
        }}
        className="hidden group-hover:inline-flex h-7 w-7 rounded-[6px] items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-danger)] hover:bg-[var(--app-danger-soft)] transition-all duration-150"
        aria-label="Delete thread"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 3600)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return `${Math.floor(seconds / 604800)}w`;
}
