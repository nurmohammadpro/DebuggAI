'use client';

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ArrowRight, LayoutGrid, Bug, Code2, Plus, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';
import { dashboardPrimaryNav, dashboardMoreNav } from '@/components/dashboard/shell/dashboard-nav';

interface CommandItem {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon: React.ElementType;
  section: 'Navigation' | 'Recent Projects' | 'Recent Chats' | 'Actions';
}

const ACTIONS: CommandItem[] = [
  { id: 'new-project', label: 'New Project', href: '/dashboard/home?create=1', description: 'Create a new project', icon: Plus, section: 'Actions' },
  { id: 'new-debug', label: 'New Debug Session', href: '/dashboard/debug', description: 'Start a new AI debug session', icon: Bug, section: 'Actions' },
  { id: 'web-builder', label: 'Web Builder', href: '/dashboard/web-builder', description: 'Open the web builder IDE', icon: Code2, section: 'Actions' },
];

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { data: projects = [] } = useMyProjects(25, true);
  const { data: chats = [] } = useMyDebugSessions(25, true);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const projectItems: CommandItem[] = useMemo(
    () =>
      projects.slice(0, 8).map((p) => ({
        id: p.id,
        label: (p.description || p.prompt || 'Untitled').slice(0, 60),
        href: `/dashboard?project=${p.id}`,
        description: 'Project',
        icon: LayoutGrid,
        section: 'Recent Projects' as const,
      })),
    [projects],
  );

  const chatItems: CommandItem[] = useMemo(
    () =>
      chats.slice(0, 8).map((c) => ({
        id: c.id,
        label: (c.error_message || c.language || 'Chat').slice(0, 60),
        href: `/dashboard/debug/history?session=${c.id}`,
        description: c.language || 'Debug session',
        icon: Bug,
        section: 'Recent Chats' as const,
      })),
    [chats],
  );

  const navItems: CommandItem[] = useMemo(
    () => [
      ...dashboardPrimaryNav.map((n) => ({
        id: n.href,
        label: n.label,
        href: n.href,
        icon: n.icon,
        section: 'Navigation' as const,
      })),
      ...dashboardMoreNav.map((n) => ({
        id: n.href,
        label: n.label,
        href: n.href,
        icon: n.icon,
        section: 'Navigation' as const,
      })),
    ],
    [],
  );

  const allItems = useMemo(
    () => [...navItems, ...ACTIONS, ...projectItems, ...chatItems],
    [navItems, projectItems, chatItems],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q),
    );
  }, [query, allItems]);

  const groupedBySection = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    }
    return groups;
  }, [filtered]);

  const flatFiltered = useMemo(() => filtered, [filtered]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const navigate = useCallback(
    (item: CommandItem) => {
      onOpenChange(false);
      router.push(item.href);
    },
    [router, onOpenChange],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && flatFiltered[selectedIndex]) {
        e.preventDefault();
        navigate(flatFiltered[selectedIndex]);
      }
    },
    [flatFiltered, selectedIndex, navigate],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="p-0 max-w-lg rounded-[10px] border-[var(--app-border)] bg-[var(--app-panel-2)]">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center border-b border-[var(--app-border)] px-4">
          <Search className="h-4 w-4 text-[var(--app-text-dim)] shrink-0" />
          <input
            ref={inputRef}
            className="w-full border-0 bg-transparent h-12 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="text-[10px] text-[var(--app-text-dim)] shrink-0 ml-2">esc</kbd>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {query.trim() === '' && (
            <div className="px-3 py-6 text-center text-[13px] text-[var(--app-text-muted)]">
              <Sparkles className="h-6 w-6 mx-auto mb-2 opacity-40" />
              Type to search projects, chats, and pages
            </div>
          )}

          {query.trim() !== '' && flatFiltered.length === 0 && (
            <div className="px-3 py-8 text-center text-[13px] text-[var(--app-text-muted)]">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {Object.entries(groupedBySection).map(([section, items]) => (
            <div key={section} className="mb-2">
              <div className="px-3 py-1.5 text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                {section}
              </div>
              {items.map((item) => {
                const idx = flatFiltered.indexOf(item);
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'flex items-center gap-3 w-full px-3 py-2 rounded-[8px] text-[13px] transition-colors text-left',
                      isSelected
                        ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                        : 'text-[var(--app-text)] hover:bg-[var(--app-surface)]',
                    )}
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <item.icon className="h-4 w-4 shrink-0 text-[var(--app-text-dim)]" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-[var(--app-text-muted)] truncate">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--app-text-dim)] opacity-0 group-hover:opacity-100" />
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
