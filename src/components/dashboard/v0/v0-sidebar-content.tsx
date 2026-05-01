'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Plus, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { v0SidebarNav } from '@/components/dashboard/v0/v0-nav';
import type { DebugSessionRow } from '@/hooks/queries/use-my-debug-sessions';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';

function SectionHeader({
  label,
  collapsed,
  onToggle,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/30"
    >
      <span>{label}</span>
      {collapsed ? (
        <ChevronRight className="h-4 w-4 opacity-70" />
      ) : (
        <ChevronDown className="h-4 w-4 opacity-70" />
      )}
    </button>
  );
}

function RecentsList({
  items,
  emptyLabel,
  hrefForId,
  titleForItem,
  onNavigate,
}: {
  items: Array<{ id: string }>;
  emptyLabel: string;
  hrefForId: (id: string) => string;
  titleForItem: (item: any) => string;
  onNavigate?: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="px-2 py-2 text-xs text-muted-foreground">{emptyLabel}</div>
    );
  }

  return (
    <div className="space-y-1">
      {items.slice(0, 6).map((item) => (
        <Link
          key={item.id}
          href={hrefForId(item.id)}
          onClick={onNavigate}
          className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/40 text-sm"
        >
          <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
          <span className="truncate">{titleForItem(item)}</span>
        </Link>
      ))}
    </div>
  );
}

export function V0SidebarContent({
  activeHref,
  recentChats,
  recentProjects,
  onNewChatClick,
  onNavigate,
  showHeader = true,
}: {
  activeHref: string;
  recentChats: DebugSessionRow[];
  recentProjects: GenerationRow[];
  onNewChatClick: () => void;
  onNavigate?: () => void;
  showHeader?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [favoritesCollapsed, setFavoritesCollapsed] = useState(true);
  const [recentsCollapsed, setRecentsCollapsed] = useState(false);

  const filteredNav = useMemo(() => {
    if (!query.trim()) return v0SidebarNav;
    const q = query.toLowerCase();
    return v0SidebarNav.filter((n) => n.label.toLowerCase().includes(q));
  }, [query]);

  const filteredChats = useMemo(() => {
    if (!query.trim()) return recentChats;
    const q = query.toLowerCase();
    return recentChats.filter((c) => {
      const title =
        (c.error_message || '').slice(0, 80) ||
        (c.explanation || '').slice(0, 80) ||
        (c.language || '').slice(0, 80);
      return title.toLowerCase().includes(q);
    });
  }, [query, recentChats]);

  const filteredProjects = useMemo(() => {
    if (!query.trim()) return recentProjects;
    const q = query.toLowerCase();
    return recentProjects.filter((p) => {
      const title = (p.description || p.prompt || 'Untitled').toLowerCase();
      return title.includes(q);
    });
  }, [query, recentProjects]);

  return (
    <div className="flex flex-col w-full min-h-0 overflow-y-auto">
      {showHeader && (
        <div className="h-12 px-4 flex items-center gap-3 border-b border-border/40">
          <Logo className="h-5 w-auto" />
          <button
            className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/40 text-sm font-medium min-w-0"
            type="button"
            title="Workspace"
          >
            <span className="truncate">Personal</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      <div className="p-3">
        <Button
          className="w-full justify-start gap-2"
          variant="outline"
          onClick={() => {
            onNewChatClick();
            onNavigate?.();
          }}
        >
          <Plus className="h-4 w-4" />
          New Chat
          <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <nav className="px-2 space-y-1">
        {filteredNav.map((item) => {
          const active = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted/40',
                active
                  ? 'bg-muted/50 text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 px-3">
        <SectionHeader
          label="Favorites"
          collapsed={favoritesCollapsed}
          onToggle={() => setFavoritesCollapsed((v) => !v)}
        />
        {!favoritesCollapsed && (
          <div className="px-2 py-2 text-xs text-muted-foreground">
            No favorites yet.
          </div>
        )}
      </div>

      <div className="mt-4 px-3 min-h-0">
        <SectionHeader
          label="Recent Chats"
          collapsed={recentsCollapsed}
          onToggle={() => setRecentsCollapsed((v) => !v)}
        />
        {!recentsCollapsed && (
          <RecentsList
            items={filteredChats as any}
            emptyLabel="No recent chats yet."
            hrefForId={() => '/dashboard/debug/history'}
            titleForItem={(c: DebugSessionRow) =>
              ((c.error_message || c.language || 'Chat') as string).slice(0, 64)
            }
            onNavigate={onNavigate}
          />
        )}
      </div>

      <div className="mt-4 px-3 pb-4">
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
        />

        <Link
          href="/dashboard/home"
          onClick={onNavigate}
          className="mt-3 flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted/40 text-sm text-muted-foreground hover:text-foreground"
        >
          <span className="opacity-80">…</span>
          More
        </Link>
      </div>
    </div>
  );
}
