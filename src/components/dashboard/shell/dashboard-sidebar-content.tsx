'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useMemo, useReducer, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  X,
  MoreHorizontal,
  Pin,
  PinOff,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { dashboardMoreNav, dashboardPrimaryNav } from '@/components/dashboard/shell/dashboard-nav';
import type { DebugSessionRow } from '@/hooks/queries/use-my-debug-sessions';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';
import { SidebarItem } from '@/components/dashboard/shell/sidebar/sidebar-item';
import { useShellStore } from '@/store/shell-store';
import { queryKeys } from '@/hooks/queries/query-keys';
import { DeleteProjectDialog } from '@/components/dashboard/projects/delete-project-dialog';
import { RenameProjectDialog } from '@/components/dashboard/projects/rename-project-dialog';
import { DeleteSessionDialog } from '@/components/dashboard/debug/delete-session-dialog';
import { RenameItemDialog } from '@/components/dashboard/shell/sidebar/rename-item-dialog';
import { NewSplitButton } from '@/components/dashboard/shell/sidebar/new-split-button';
import { useSessionStore } from '@/store/session-store';

type DialogState =
  | { type: 'none' }
  | { type: 'renameChat'; id: string; initial: string }
  | { type: 'deleteChat'; id: string; name: string }
  | { type: 'renameProject'; id: string; initial: string }
  | { type: 'deleteProject'; id: string; name: string };

function dialogReducer(_: DialogState, action: DialogState): DialogState {
  return action;
}

// ─── Helpers ────────────────────────────────────────────────────────────

function chatTitle(chat: DebugSessionRow, overrides: Record<string, string>): string {
  return (
    overrides[chat.id] ||
    (chat.error_message || '').slice(0, 80) ||
    (chat.explanation || '').slice(0, 80) ||
    (chat.language || '') ||
    'Chat'
  );
}

function projectTitle(project: GenerationRow): string {
  return ((project.description || project.prompt || 'Untitled') as string).slice(0, 64);
}

function relativeTime(dateStr: string | undefined): string {
  if (!dateStr) return '';
  const dt = new Date(dateStr).getTime();
  if (isNaN(dt)) return '';
  const now = Date.now();
  const seconds = Math.floor((now - dt) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

// ─── Section Header ──────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 px-3 text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
      {children}
    </div>
  );
}

// ─── Session Row ─────────────────────────────────────────────────────────

function SessionRow({
  href,
  label,
  timestamp,
  collapsed,
  pinned,
  onTogglePinned,
  onRename,
  onDelete,
  onNavigate,
}: {
  href: string;
  label: string;
  timestamp: string;
  collapsed: boolean;
  pinned: boolean;
  onTogglePinned: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onNavigate?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  if (collapsed) {
    return (
      <div className="group relative px-1">
        <Link
          href={href}
          onClick={onNavigate}
          title={label}
          className="flex items-center justify-center w-full px-2 py-2.5 text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors rounded-[6px]"
        >
          <span className="h-2 w-2 rounded-full bg-[var(--app-text-dim)]" />
        </Link>
      </div>
    );
  }

  return (
    <div
      className="group relative"
      onMouseLeave={() => setShowMenu(false)}
    >
      <Link
        href={href}
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-2 text-[13px] transition-colors rounded-[6px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]"
      >
        <span className="h-2 w-2 rounded-full bg-[var(--app-text-dim)] shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate">{label}</span>
          {timestamp && (
            <span className="text-[10px] text-[var(--app-text-dim)]">{timestamp}</span>
          )}
        </div>
        {pinned && <Pin className="h-3 w-3 text-[var(--app-text-dim)] shrink-0" />}
      </Link>

      <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
        <DropdownMenu open={showMenu} onOpenChange={setShowMenu}>
          <DropdownMenuTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
              className={cn(
                'h-7 w-7 inline-flex items-center justify-center rounded-[6px] text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors',
                showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
              )}
              aria-label="More"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel-2)]">
            <DropdownMenuItem onClick={onTogglePinned} className="cursor-pointer text-[13px]">
              {pinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
              {pinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                window.open(href, '_blank', 'noopener,noreferrer');
              }}
              className="cursor-pointer text-[13px]"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in new tab
            </DropdownMenuItem>
            {onRename && (
              <DropdownMenuItem onClick={onRename} className="cursor-pointer text-[13px]">
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-[13px] text-[var(--app-danger)]">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function DashboardSidebarContent({
  activeHref,
  recentChats,
  recentProjects,
  onNewChatClick,
  onNavigate,
  collapsed,
}: {
  activeHref: string;
  recentChats: DebugSessionRow[];
  recentProjects: GenerationRow[];
  onNewChatClick: () => void;
  onNavigate?: () => void;
  collapsed: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useSessionStore();
  const {
    pinnedProjectIds,
    pinnedChatIds,
    chatTitleOverrides,
    togglePinnedProject,
    togglePinnedChat,
    updateChatTitleOverride,
    setPinnedProjectIds,
    setPinnedChatIds,
  } = useShellStore();

  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const [dialog, dispatchDialog] = useReducer(dialogReducer, { type: 'none' as const });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    searchRef.current?.blur();
  }, []);

  const isSearching = query.trim().length > 0;

  // ── filtered data ──────────────────────────────────────────────────────

  const filteredChats = useMemo(() => {
    if (!isSearching) return recentChats;
    const q = query.toLowerCase();
    return recentChats.filter((c) => {
      const title = chatTitle(c, chatTitleOverrides).toLowerCase();
      return title.includes(q);
    });
  }, [chatTitleOverrides, query, recentChats, isSearching]);

  const filteredProjects = useMemo(() => {
    if (!isSearching) return recentProjects;
    const q = query.toLowerCase();
    return recentProjects.filter((p) => projectTitle(p).toLowerCase().includes(q));
  }, [query, recentProjects, isSearching]);

  const pinnedProjects = useMemo(() => {
    const ids = new Set(pinnedProjectIds);
    return recentProjects.filter((p) => ids.has(p.id));
  }, [pinnedProjectIds, recentProjects]);

  const pinnedChats = useMemo(() => {
    const ids = new Set(pinnedChatIds);
    return recentChats.filter((c) => ids.has(c.id));
  }, [pinnedChatIds, recentChats]);

  const hasPinned = pinnedChats.length > 0 || pinnedProjects.length > 0;


  // ── dialog openers ─────────────────────────────────────────────────────

  const openRenameChat = (chat: DebugSessionRow) => {
    const fallback =
      (chat.error_message || '').slice(0, 64) ||
      (chat.explanation || '').slice(0, 64) ||
      chat.language ||
      'Chat';
    dispatchDialog({
      type: 'renameChat',
      id: chat.id,
      initial: chatTitleOverrides[chat.id] || fallback,
    });
  };

  const openDeleteChat = (chat: DebugSessionRow) => {
    const fallback = (chatTitleOverrides[chat.id] ||
      (chat.error_message || '').slice(0, 64) ||
      chat.language ||
      'Chat') as string;
    dispatchDialog({ type: 'deleteChat', id: chat.id, name: fallback });
  };

  const openRenameProject = (project: GenerationRow) => {
    const name = projectTitle(project);
    dispatchDialog({ type: 'renameProject', id: project.id, initial: name });
  };

  const openDeleteProject = (project: GenerationRow) => {
    const name = projectTitle(project);
    dispatchDialog({ type: 'deleteProject', id: project.id, name: name });
  };

  // ── user display ───────────────────────────────────────────────────────

  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const userPlan = user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Free';

  // ── combined nav for Ctrl+K search mode ─────────────────────────────────

  const allNavItems = useMemo(
    () => [...dashboardPrimaryNav, ...dashboardMoreNav],
    [],
  );

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 w-full min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-4">
      {/* ── New Chat / Search ──────────────────────────────────────── */}
      <div className={cn('px-3 pt-3 pb-2 space-y-2', collapsed && 'px-2')}>
        <NewSplitButton
          collapsed={collapsed}
          onNewChat={() => {
            onNewChatClick();
            onNavigate?.();
          }}
          onNewProject={() => {
            router.push('/dashboard/home?create=1');
            onNavigate?.();
          }}
        />

        {!collapsed && (
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-text-dim)] transition-colors group-focus-within:text-[var(--app-text-muted)]" />
            <input
              ref={searchRef}
              className="w-full h-9 pl-9 pr-12 text-[13px] rounded-[8px] bg-[var(--app-surface)] border-0 text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 transition-all"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query ? (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center hover:bg-[var(--app-surface)] rounded-[4px] transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 text-[var(--app-text-muted)]" />
              </button>
            ) : (
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--app-text-dim)] pointer-events-none">
                {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘/' : 'Ctrl+/'}
              </kbd>
            )}
          </div>
        )}
      </div>

      {collapsed && (
        <div className="px-2 pb-2">
          <button
            onClick={() => searchRef.current?.focus()}
            className="w-full flex items-center justify-center py-2 text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors rounded-[6px]"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── NAV ────────────────────────────────────────────────────── */}
      <nav className={cn('space-y-0.5', collapsed ? 'px-1' : 'px-2')}>
        {!isSearching && !collapsed && <SectionLabel>Tools</SectionLabel>}

        {isSearching
          ? allNavItems
              .filter((n) => n.label.toLowerCase().includes(query.toLowerCase()))
              .map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={activeHref === item.href || activeHref.startsWith(item.href + '/')}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))
          : (
            <>
              {dashboardPrimaryNav.map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={activeHref === item.href}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
              {dashboardMoreNav.map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={activeHref === item.href || activeHref.startsWith(item.href + '/')}
                  collapsed={collapsed}
                  onNavigate={onNavigate}
                />
              ))}
            </>
          )}
      </nav>

      {/* ── Favorites (pinned items) ────────────────────────────────── */}
      {!isSearching && hasPinned && (
        <div className={cn('mt-4', collapsed ? 'px-1' : 'px-2')}>
          {!collapsed && <SectionLabel>Favorites</SectionLabel>}

          {collapsed && (
            <div className="flex justify-center py-2">
              <div className="h-px w-6 bg-[var(--app-border)]" />
            </div>
          )}

          <div className="space-y-0.5">
            {pinnedChats.map((c) => (
              <SessionRow
                key={c.id}
                href={`/dashboard/debug/history?session=${c.id}`}
                label={chatTitle(c, chatTitleOverrides)}
                timestamp={relativeTime((c as DebugSessionRow & { created_at?: string }).created_at)}
                collapsed={collapsed}
                pinned
                onTogglePinned={() => togglePinnedChat(c.id)}
                onRename={() => openRenameChat(c)}
                onDelete={() => openDeleteChat(c)}
                onNavigate={onNavigate}
              />
            ))}
            {pinnedProjects.map((p) => (
              <SessionRow
                key={p.id}
                href={`/dashboard?project=${p.id}`}
                label={projectTitle(p)}
                timestamp={relativeTime((p as GenerationRow & { created_at?: string }).created_at)}
                collapsed={collapsed}
                pinned
                onTogglePinned={() => togglePinnedProject(p.id)}
                onRename={() => openRenameProject(p)}
                onDelete={() => openDeleteProject(p)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Chats ────────────────────────────────────────────── */}
      <div className={cn('mt-4 flex-1 min-h-0', collapsed ? 'px-1' : 'px-2')}>
        {!isSearching && recentChats.length > 0 && (
          <>
            {!collapsed && <SectionLabel>Recent</SectionLabel>}

            {collapsed && pinnedChats.length === 0 && pinnedProjects.length === 0 && (
              <div className="flex justify-center py-2">
                <div className="h-px w-6 bg-[var(--app-border)]" />
              </div>
            )}

            <div className="space-y-0.5">
              {filteredChats.slice(0, isSearching ? undefined : 10).map((c) => {
                const pinned = pinnedChatIds.includes(c.id);
                return (
                  <SessionRow
                    key={c.id}
                    href={`/dashboard/debug/history?session=${c.id}`}
                    label={chatTitle(c, chatTitleOverrides)}
                    timestamp={relativeTime((c as DebugSessionRow & { created_at?: string }).created_at)}
                    collapsed={collapsed}
                    pinned={pinnedChatIds.includes(c.id)}
                    onTogglePinned={() => togglePinnedChat(c.id)}
                    onRename={() => openRenameChat(c)}
                    onDelete={() => openDeleteChat(c)}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>

            {!isSearching && filteredChats.length === 0 && !collapsed && (
              <div className="px-3 py-2 text-xs text-[var(--app-text-dim)]">
                No recent chats yet.
              </div>
            )}
          </>
        )}

        {/* ── Recent Projects ──────────────────────────────────────── */}
        {!isSearching && filteredProjects.length > 0 && (
          <>
            {!collapsed && <SectionLabel>Recent Projects</SectionLabel>}
            <div className="space-y-0.5">
              {filteredProjects.slice(0, isSearching ? undefined : 6).map((p) => {
                return (
                  <SessionRow
                    key={p.id}
                    href={`/dashboard?project=${p.id}`}
                    label={projectTitle(p)}
                    timestamp={relativeTime((p as GenerationRow & { created_at?: string }).created_at)}
                    collapsed={collapsed}
                    pinned={pinnedProjectIds.includes(p.id)}
                    onTogglePinned={() => togglePinnedProject(p.id)}
                    onRename={() => openRenameProject(p)}
                    onDelete={() => openDeleteProject(p)}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>
          </>
        )}

        {/* ── Search results header ─────────────────────────────────── */}
        {isSearching && filteredChats.length === 0 && filteredProjects.length === 0 && (
          <div className="px-3 py-4 text-xs text-[var(--app-text-dim)] text-center">
            No results found.
          </div>
        )}
      </div>
      </div>

      {/* ── User Footer ────────────────────────────────────────────── */}
      <div className="shrink-0 p-2">
        <button
          className={cn(
            'flex w-full items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]',
            collapsed && 'justify-center px-2',
          )}
        >
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={userDisplayName}
              width={28}
              height={28}
              unoptimized
              className="h-7 w-7 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--app-surface)]">
              <span className="text-xs font-medium text-[var(--app-text-muted)]">{userInitial}</span>
            </div>
          )}
          {!collapsed && (
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[13px] text-[var(--app-text)] truncate w-full">{userDisplayName}</span>
              <span className="text-[11px] text-[var(--app-text-dim)]">{userPlan} Plan</span>
            </div>
          )}
        </button>
      </div>

      {/* ── Dialogs ────────────────────────────────────────────────── */}
      <RenameItemDialog
        open={dialog.type === 'renameChat'}
        onOpenChange={() => dispatchDialog({ type: 'none' })}
        title="Rename chat"
        description="Renames this chat in your sidebar (local to this browser)."
        initialValue={dialog.type === 'renameChat' ? dialog.initial : ''}
        placeholder="Chat name"
        onSave={(nextValue) => {
          const v = nextValue.trim();
          if (!v || dialog.type !== 'renameChat') return;
          updateChatTitleOverride(dialog.id, v);
          dispatchDialog({ type: 'none' });
        }}
      />

      <DeleteSessionDialog
        open={dialog.type === 'deleteChat'}
        onOpenChange={() => dispatchDialog({ type: 'none' })}
        sessionId={dialog.type === 'deleteChat' ? dialog.id : ''}
        sessionName={dialog.type === 'deleteChat' ? dialog.name : ''}
        onDeleted={async () => {
          if (dialog.type !== 'deleteChat') return;
          setPinnedChatIds(pinnedChatIds.filter((x) => x !== dialog.id));
          await queryClient.invalidateQueries({ queryKey: queryKeys.myDebugSessions });
        }}
      />

      <RenameProjectDialog
        open={dialog.type === 'renameProject'}
        onOpenChange={() => dispatchDialog({ type: 'none' })}
        projectId={dialog.type === 'renameProject' ? dialog.id : ''}
        initialName={dialog.type === 'renameProject' ? dialog.initial : ''}
        onRenamed={async () => {
          await queryClient.invalidateQueries({ queryKey: queryKeys.myProjects });
        }}
      />

      <DeleteProjectDialog
        open={dialog.type === 'deleteProject'}
        onOpenChange={() => dispatchDialog({ type: 'none' })}
        projectId={dialog.type === 'deleteProject' ? dialog.id : ''}
        projectName={dialog.type === 'deleteProject' ? dialog.name : ''}
        onDeleted={async () => {
          if (dialog.type !== 'deleteProject') return;
          setPinnedProjectIds(pinnedProjectIds.filter((x) => x !== dialog.id));
          await queryClient.invalidateQueries({ queryKey: queryKeys.myProjects });
        }}
      />
    </div>
  );
}
