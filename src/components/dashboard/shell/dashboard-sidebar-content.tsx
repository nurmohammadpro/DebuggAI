'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { dashboardMoreNav, dashboardPrimaryNav } from '@/components/dashboard/shell/dashboard-nav';
import type { DebugSessionRow } from '@/hooks/queries/use-my-debug-sessions';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';
import { SidebarSection } from '@/components/dashboard/shell/sidebar/sidebar-section';
import { SidebarItem, SidebarItemMenu } from '@/components/dashboard/shell/sidebar/sidebar-item';
import { readSidebarPrefs, writeSidebarPrefs } from '@/lib/dashboard/sidebar-prefs';
import { queryKeys } from '@/hooks/queries/query-keys';
import { DeleteProjectDialog } from '@/components/dashboard/projects/delete-project-dialog';
import { RenameProjectDialog } from '@/components/dashboard/projects/rename-project-dialog';
import { DeleteSessionDialog } from '@/components/dashboard/debug/delete-session-dialog';
import { RenameItemDialog } from '@/components/dashboard/shell/sidebar/rename-item-dialog';
import { NewSplitButton } from '@/components/dashboard/shell/sidebar/new-split-button';

type DialogState =
  | { type: 'none' }
  | { type: 'renameChat'; id: string; initial: string }
  | { type: 'deleteChat'; id: string; name: string }
  | { type: 'renameProject'; id: string; initial: string }
  | { type: 'deleteProject'; id: string; name: string };

function dialogReducer(_: DialogState, action: DialogState): DialogState {
  return action;
}

function RecentsList({
  items,
  emptyLabel,
  hrefForId,
  titleForItem,
  onNavigate,
  collapsed,
  pinnedIds,
  onTogglePinned,
  onRenameItem,
  onDeleteItem,
}: {
  items: Array<{ id: string }>;
  emptyLabel: string;
  hrefForId: (id: string) => string;
  titleForItem: (item: any) => string;
  onNavigate?: () => void;
  collapsed: boolean;
  pinnedIds: string[];
  onTogglePinned: (id: string) => void;
  onRenameItem?: (item: any) => void;
  onDeleteItem?: (item: any) => void;
}) {
  if (items.length === 0) {
    return collapsed ? null : (
      <div className="px-2 py-2 text-xs text-muted-foreground">{emptyLabel}</div>
    );
  }

  return (
    <div className="space-y-1">
      {items.slice(0, 6).map((item) => (
        <SidebarItem
          key={item.id}
          href={hrefForId(item.id)}
          label={titleForItem(item)}
          icon={() => <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
          active={false}
          collapsed={collapsed}
          onNavigate={onNavigate}
          menu={
            <SidebarItemMenu
              pinned={pinnedIds.includes(item.id)}
              onTogglePinned={() => onTogglePinned(item.id)}
              onOpenInNewTab={() => {
                window.open(hrefForId(item.id), '_blank', 'noopener,noreferrer');
              }}
              onRename={onRenameItem ? () => onRenameItem(item) : undefined}
              onDelete={onDeleteItem ? () => onDeleteItem(item) : undefined}
            />
          }
        />
      ))}
    </div>
  );
}

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
  const [query, setQuery] = useState('');
  const [recentsCollapsed, setRecentsCollapsed] = useState(false);
  const [moreCollapsed, setMoreCollapsed] = useState(true);
  const [prefs, setPrefs] = useState(() => readSidebarPrefs());
  const searchRef = useRef<HTMLInputElement>(null);
  const [dialog, dispatchDialog] = useReducer(dialogReducer, { type: 'none' as const });

  useEffect(() => {
    writeSidebarPrefs({ ...prefs, collapsed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs, collapsed]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredPrimary = useMemo(() => {
    if (!query.trim()) return dashboardPrimaryNav;
    const q = query.toLowerCase();
    return dashboardPrimaryNav.filter((n) => n.label.toLowerCase().includes(q));
  }, [query]);

  const filteredMore = useMemo(() => {
    if (!query.trim()) return dashboardMoreNav;
    const q = query.toLowerCase();
    return dashboardMoreNav.filter((n) => n.label.toLowerCase().includes(q));
  }, [query]);

  const filteredChats = useMemo(() => {
    if (!query.trim()) return recentChats;
    const q = query.toLowerCase();
    return recentChats.filter((c) => {
      const title =
        prefs.chatTitleOverrides[c.id] ||
        (c.error_message || '').slice(0, 80) ||
        (c.explanation || '').slice(0, 80) ||
        (c.language || '').slice(0, 80);
      return title.toLowerCase().includes(q);
    });
  }, [prefs.chatTitleOverrides, query, recentChats]);

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return recentProjects;
    const q = query.toLowerCase();
    return recentProjects.filter((p) => {
      const title = (p.description || p.prompt || 'Untitled').toLowerCase();
      return title.includes(q);
    });
  }, [query, recentProjects]);

  const pinnedProjects = useMemo(() => {
    const ids = new Set(prefs.pinnedProjectIds);
    return recentProjects.filter((p) => ids.has(p.id));
  }, [prefs.pinnedProjectIds, recentProjects]);

  const pinnedChats = useMemo(() => {
    const ids = new Set(prefs.pinnedChatIds);
    return recentChats.filter((c) => ids.has(c.id));
  }, [prefs.pinnedChatIds, recentChats]);

  const togglePinnedProject = (id: string) => {
    setPrefs((prev) => {
      const exists = prev.pinnedProjectIds.includes(id);
      return {
        ...prev,
        pinnedProjectIds: exists
          ? prev.pinnedProjectIds.filter((x) => x !== id)
          : [id, ...prev.pinnedProjectIds],
      };
    });
  };

  const togglePinnedChat = (id: string) => {
    setPrefs((prev) => {
      const exists = prev.pinnedChatIds.includes(id);
      return {
        ...prev,
        pinnedChatIds: exists
          ? prev.pinnedChatIds.filter((x) => x !== id)
          : [id, ...prev.pinnedChatIds],
      };
    });
  };

  const openRenameChat = (chat: DebugSessionRow) => {
    const fallback =
      (chat.error_message || '').slice(0, 64) ||
      (chat.explanation || '').slice(0, 64) ||
      chat.language ||
      'Chat';
    dispatchDialog({
      type: 'renameChat',
      id: chat.id,
      initial: prefs.chatTitleOverrides[chat.id] || fallback,
    });
  };

  const openDeleteChat = (chat: DebugSessionRow) => {
    const fallback =
      (prefs.chatTitleOverrides[chat.id] ||
        (chat.error_message || '').slice(0, 64) ||
        chat.language ||
        'Chat') as string;
    dispatchDialog({ type: 'deleteChat', id: chat.id, name: fallback });
  };

  const openRenameProject = (project: GenerationRow) => {
    const name = ((project.description || project.prompt || 'Untitled') as string).slice(0, 64);
    dispatchDialog({ type: 'renameProject', id: project.id, initial: name });
  };

  const openDeleteProject = (project: GenerationRow) => {
    const name = ((project.description || project.prompt || 'Untitled') as string).slice(0, 64);
    dispatchDialog({ type: 'deleteProject', id: project.id, name: name });
  };

  return (
    <div
      className={cn(
        'flex flex-col w-full min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent',
        collapsed ? 'px-1' : ''
      )}
    >
      <div className={cn('transition-all duration-300', collapsed ? 'p-2' : 'p-3')}>
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
      </div>

      {!collapsed && (
        <div className="px-3 pb-3 transition-all duration-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors duration-200" />
            <Input
              ref={searchRef}
              className="pl-9 pr-12 transition-all duration-200 focus:ring-2 focus:ring-primary/50"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60 pointer-events-none transition-all duration-200">
              {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '⌘/' : 'Ctrl+/'}
            </kbd>
          </div>
        </div>
      )}

      <nav className={cn('space-y-1 transition-all duration-300', collapsed ? 'px-0' : 'px-2')}>
        {filteredPrimary.map((item) => {
          const active = activeHref === item.href;
          return (
            <SidebarItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={active}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>

      {!collapsed && (
        <div className="mt-4 px-3">
          <SidebarSection
            label="Favorites"
            collapsed={pinnedChats.length === 0 && pinnedProjects.length === 0}
            onToggle={() => {
              // Toggle behavior not stored; section auto-opens when pinned items exist.
              if (pinnedChats.length || pinnedProjects.length) {
                setPrefs((p) => ({ ...p, pinnedChatIds: [], pinnedProjectIds: [] }));
              }
            }}
            dense
          >
            <div className="space-y-1">
              {pinnedChats.map((c) => (
                <SidebarItem
                  key={c.id}
                  href={`/dashboard/debug/history?session=${c.id}`}
                  label={(
                    (prefs.chatTitleOverrides[c.id] ||
                      c.error_message ||
                      c.language ||
                      'Chat') as string
                  ).slice(0, 64)}
                  icon={() => <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
                  active={false}
                  collapsed={false}
                  onNavigate={onNavigate}
                  menu={
                    <SidebarItemMenu
                      pinned
                      onTogglePinned={() => togglePinnedChat(c.id)}
                      onOpenInNewTab={() => {
                        window.open(`/dashboard/debug/history?session=${c.id}`, '_blank', 'noopener,noreferrer');
                      }}
                      onRename={() => openRenameChat(c)}
                      onDelete={() => openDeleteChat(c)}
                    />
                  }
                />
              ))}
              {pinnedProjects.map((p) => (
                <SidebarItem
                  key={p.id}
                  href={`/dashboard?project=${p.id}`}
                  label={((p.description || p.prompt || 'Untitled') as string).slice(0, 64)}
                  icon={() => <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />}
                  active={false}
                  collapsed={false}
                  onNavigate={onNavigate}
                  menu={
                    <SidebarItemMenu
                      pinned
                      onTogglePinned={() => togglePinnedProject(p.id)}
                      onOpenInNewTab={() => {
                        window.open(`/dashboard?project=${p.id}`, '_blank', 'noopener,noreferrer');
                      }}
                      onRename={() => openRenameProject(p)}
                      onDelete={() => openDeleteProject(p)}
                    />
                  }
                />
              ))}
            </div>
          </SidebarSection>
        </div>
      )}

      {!collapsed && (
        <div className="mt-4 px-3 min-h-0 transition-all duration-300">
          <SidebarSection
            label="Recent Chats"
            collapsed={recentsCollapsed}
            onToggle={() => setRecentsCollapsed((v) => !v)}
            dense
          >
          <RecentsList
            items={filteredChats as any}
            emptyLabel="No recent chats yet."
            hrefForId={(id) => `/dashboard/debug/history?session=${id}`}
            titleForItem={(c: DebugSessionRow) =>
              ((
                prefs.chatTitleOverrides[c.id] ||
                (c.error_message || c.language || 'Chat')
              ) as string).slice(0, 64)
            }
            onNavigate={onNavigate}
            collapsed={false}
            pinnedIds={prefs.pinnedChatIds}
            onTogglePinned={togglePinnedChat}
            onRenameItem={(c: DebugSessionRow) => openRenameChat(c)}
            onDeleteItem={(c: DebugSessionRow) => openDeleteChat(c)}
          />
        </SidebarSection>
      </div>
      )}

      {!collapsed && (
        <div className="mt-4 px-3 pb-4 transition-all duration-300">
          <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
            Recent Projects
          </div>
          <RecentsList
            items={filteredProjects as any}
            emptyLabel="No projects yet."
            hrefForId={(id) => `/dashboard?project=${id}`}
            titleForItem={(p: GenerationRow) =>
              ((p.description || p.prompt || 'Untitled') as string).slice(0, 64)
            }
            onNavigate={onNavigate}
            collapsed={false}
            pinnedIds={prefs.pinnedProjectIds}
            onTogglePinned={togglePinnedProject}
            onRenameItem={(p: GenerationRow) => openRenameProject(p)}
            onDeleteItem={(p: GenerationRow) => openDeleteProject(p)}
          />

          <SidebarSection
            label="More"
            collapsed={moreCollapsed}
            onToggle={() => setMoreCollapsed((v) => !v)}
          >
            <div className="space-y-1">
              {filteredMore.map((item) => {
                const active =
                  activeHref === item.href || activeHref.startsWith(item.href + '/');
                return (
                  <SidebarItem
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={active}
                    collapsed={false}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </div>
          </SidebarSection>
        </div>
      )}

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
          setPrefs((prev) => ({
            ...prev,
            chatTitleOverrides: { ...prev.chatTitleOverrides, [dialog.id]: v },
          }));
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
          setPrefs((prev) => ({
            ...prev,
            pinnedChatIds: prev.pinnedChatIds.filter((x) => x !== dialog.id),
          }));
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
          setPrefs((prev) => ({
            ...prev,
            pinnedProjectIds: prev.pinnedProjectIds.filter((x) => x !== dialog.id),
          }));
          await queryClient.invalidateQueries({ queryKey: queryKeys.myProjects });
        }}
      />
    </div>
  );
}
