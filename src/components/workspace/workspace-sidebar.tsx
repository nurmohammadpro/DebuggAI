'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import {
  Home,
  Menu,
  Pencil,
  Bug,
  ListChecks,
  GitBranch,
  Zap,
  Sun,
  Moon,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ChevronDown,
  ChevronUp,
  History,
  Settings,
  Search,
  MessageSquare,
  FolderKanban,
  GripVertical,
  Trash2,
  Pencil as PencilIcon,
  Loader2,
  Brain,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { useMyThreads } from '@/hooks/queries/use-my-threads';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { cn } from '@/lib/utils';
import { BrandLockup } from '@/components/logo';
import { formatDistanceToNowStrict } from 'date-fns';
import { getSession } from '@/hooks/use-session';

import { useGenerationStore } from '@/store/generation-store';
import { useConfirmDialog } from '@/components/admin/confirm-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';
import type { ThreadRow } from '@/hooks/queries/use-my-threads';
import { toast } from 'sonner';

interface WorkspaceSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  variant?: 'fixed' | 'inline';
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  recentProjects?: GenerationRow[];
  recentThreads?: ThreadRow[];
  /** External mobile drawer control (e.g. from hamburger button). Overrides internal state. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  onMemoryOpen?: () => void;
}

/**
 * Workspace sidebar — v0-style single sidebar used across the app.
 *
 * Two modes:
 * - `variant="fixed"` (default, workspace): hidden by default, opens as overlay
 * - `variant="inline"` (dashboard): always visible, collapses to icon rail
 */
export function WorkspaceSidebar({
  isOpen,
  onClose,
  variant = 'fixed',
  collapsed = false,
  onToggleCollapsed,
  recentProjects: externalProjects,
  recentThreads: externalThreads,
  mobileOpen: externalMobileOpen,
  onMobileClose: externalMobileClose,
  onMemoryOpen,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useSessionStore();
  const { resolvedTheme, setTheme } = useTheme();
  const { setThreadId, clearThread } = useGenerationStore();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const queryClient = useQueryClient();
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const touchStartX = useRef(0);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // Mobile drawer: external prop overrides internal state
  const mobileOpen = externalMobileOpen !== undefined ? externalMobileOpen : internalMobileOpen;
  const handleMobileClose = useCallback(() => {
    if (externalMobileOpen !== undefined) externalMobileClose?.();
    else setInternalMobileOpen(false);
  }, [externalMobileOpen, externalMobileClose]);

  // ── Data ──
  const activeProjectId = searchParams?.get('project') || '';
  const { data: fetchedThreads = [] } = useMyThreads(10, !!activeProjectId, activeProjectId || null);
  const { data: fetchedProjects = [] } = useMyProjects(8);

  const threads = externalThreads ?? fetchedThreads;
  const projects = externalProjects ?? fetchedProjects;

  // Sync isOpen → internal mobile state only in fixed mode without external control
  useEffect(() => {
    if (externalMobileOpen === undefined && variant === 'fixed') {
      const syncTimer = setTimeout(() => setInternalMobileOpen(isOpen), 0);
      return () => clearTimeout(syncTimer);
    }
  }, [isOpen, variant, externalMobileOpen]);

  // ── Draggable nav order (persisted) ──
  const [navOrder, setNavOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('debuggai.sidebar.navOrder');
      return saved ? JSON.parse(saved) : ['home', 'builder', 'debug', 'runs', 'branches'];
    } catch { return ['home', 'builder', 'debug', 'runs', 'branches']; }
  });
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const touchDragRef = useRef<{ key: string; startY: number } | null>(null);

  const persistNavOrder = (order: string[]) => {
    setNavOrder(order);
    try { localStorage.setItem('debuggai.sidebar.navOrder', JSON.stringify(order)); } catch {}
  };

  const reorderItem = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    const fromIdx = navOrder.indexOf(fromKey);
    const toIdx = navOrder.indexOf(toKey);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...navOrder];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, fromKey);
    persistNavOrder(next);
  };

  const handleDragStart = (e: React.DragEvent, key: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragging(key);
  };
  const handleDragOverSlot = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragging !== key) setDragOver(key);
  };
  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!dragging || dragging === targetKey) { setDragging(null); setDragOver(null); return; }
    reorderItem(dragging, targetKey);
    setDragging(null);
    setDragOver(null);
  };

  // Touch drag for mobile nav reorder
  const handleTouchStart = (e: React.TouchEvent, key: string) => {
    touchDragRef.current = { key, startY: e.touches[0]!.clientY };
    setDragging(key);
  };
  const handleTouchMove = (e: React.TouchEvent, targetKey: string) => {
    if (!touchDragRef.current || touchDragRef.current.key === targetKey) return;
    const dy = Math.abs(e.touches[0]!.clientY - touchDragRef.current.startY);
    if (dy > 20) {
      setDragOver(targetKey);
    }
  };
  const handleTouchEnd = (targetKey: string) => {
    const fromKey = touchDragRef.current?.key;
    if (fromKey && fromKey !== targetKey) {
      reorderItem(fromKey, targetKey);
    }
    touchDragRef.current = null;
    setDragging(null);
    setDragOver(null);
  };

  // ── Nav definitions ──
  const isWorkspace = pathname === '/dashboard' && !!activeProjectId;
  const isDashboardHome = pathname === '/dashboard' && !activeProjectId;
  const isDebug = pathname === '/dashboard/debug' || pathname.startsWith('/dashboard/debug/');
  const isRuns = pathname === '/dashboard/runs' || pathname.startsWith('/dashboard/runs/');
  const isBranches = pathname === '/dashboard/branches';
  const isWebBuilder = pathname === '/dashboard/web-builder';

  const allNavItems = useMemo(() => ({
    home:     { href: '/dashboard/home', icon: Home, label: 'Home', active: isDashboardHome, shortcut: 'H', badge: 0 },
    builder:  { href: `/dashboard?project=${activeProjectId}`, icon: Pencil, label: 'Builder', active: isWorkspace, shortcut: 'B', badge: 0 },
    debug:    { href: '/dashboard/debug', icon: Bug, label: 'Debug', active: isDebug || isWebBuilder, shortcut: 'D', badge: 0 },
    runs:     { href: '/dashboard/runs', icon: ListChecks, label: 'Runs', active: isRuns, shortcut: 'R', badge: 0 },
    branches: { href: '/dashboard/branches', icon: GitBranch, label: 'Branches', active: isBranches, shortcut: 'G', badge: 0 },
  }), [activeProjectId, isWorkspace, isDashboardHome, isDebug, isRuns, isBranches, isWebBuilder]);

  // Ordered nav: primary (home, builder) always first, then remaining
  const primaryKeys = ['home', 'builder'];
  const secondaryKeys = navOrder.filter(k => !primaryKeys.includes(k));

  // Only show Builder when a project is active
  const visiblePrimaryKeys = primaryKeys.filter(k => k !== 'builder' || !!activeProjectId);

  const primaryItems = visiblePrimaryKeys.map(k => ({ key: k, ...allNavItems[k as keyof typeof allNavItems] }));
  const secondaryItems = secondaryKeys.map(k => ({ key: k, ...allNavItems[k as keyof typeof allNavItems] }));

  // Filter by search
  const filterBySearch = (items: typeof primaryItems) => {
    if (!sidebarSearch.trim()) return items;
    const q = sidebarSearch.toLowerCase();
    return items.filter(i => i.label.toLowerCase().includes(q) || i.key.includes(q));
  };

  const filteredPrimary = filterBySearch(primaryItems);
  const filteredSecondary = filterBySearch(secondaryItems);

  // ── Recent threads (conversation history) ──
  const recentThreads = useMemo(() => threads.slice(0, 10), [threads]);

  // ── Current project context ──
  const currentProject = useMemo(
    () => activeProjectId ? projects.find(p => p.id === activeProjectId) : null,
    [activeProjectId, projects]
  );

  const credits = user?.credits;

  // ── Thread actions ──
  const handleRenameThread = useCallback(async (thread: ThreadRow) => {
    const next = window.prompt('Rename thread', (thread.title || '').trim() || 'New thread');
    if (next == null) return;
    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;
    await fetch(`/api/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',  },
      body: JSON.stringify({ title: next }),
    });
    router.refresh();
  }, [router]);

  const handleDeleteThread = useCallback(async (thread: ThreadRow) => {
    const ok = await confirm('Delete thread?', 'This cannot be undone.', { confirmText: 'Delete', variant: 'destructive' });
    if (!ok) return;
    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/threads/${thread.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`,  },
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
  }, [confirm, queryClient, searchParams, activeProjectId, clearThread, router]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); if (activeProjectId) router.push(`/dashboard?project=${activeProjectId}`); break;
        case 'h': e.preventDefault(); router.push('/dashboard/home'); break;
        case 'k': e.preventDefault(); setSidebarSearch(''); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeProjectId, router]);

  // ── Mobile swipe gesture ──
  const handleDrawerTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
  };
  const handleDrawerTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches[0]!.clientX - touchStartX.current < -60) handleMobileClose();
  }, [handleMobileClose]);

  // ── Escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleMobileClose();
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, handleMobileClose]);

  // ── Shared nav/sections content ──
  const navSection = (
    <>
      {/* Primary nav */}
      {filteredPrimary.map(item => (
        <NavLinkDesktop key={item.key} item={item} expanded={!collapsed}
          onDragStart={(e) => handleDragStart(e, item.key)}
          onDragOver={(e) => handleDragOverSlot(e, item.key)}
          onDrop={(e) => handleDrop(e, item.key)}
          isDragOver={dragOver === item.key} isDragging={dragging === item.key}
          showGrip={!collapsed} />
      ))}

      {/* Separator + tools */}
      {!collapsed && (
        <>
          <div className="px-1.5 pt-3 pb-1">
            <button onClick={() => setShowSecondary(!showSecondary)}
              className="flex items-center gap-2 w-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors">
              Tools {showSecondary ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </button>
          </div>

          {showSecondary && filteredSecondary.map(item => (
            <NavLinkDesktop key={item.key} item={item} expanded={true}
              onDragStart={(e) => handleDragStart(e, item.key)}
              onDragOver={(e) => handleDragOverSlot(e, item.key)}
              onDrop={(e) => handleDrop(e, item.key)}
              isDragOver={dragOver === item.key} isDragging={dragging === item.key}
              showGrip={true} />
          ))}
        </>
      )}

      {/* ── Recent Projects ── */}
      {!collapsed && projects.length > 0 && (
        <div className="pt-4 border-t border-[var(--app-border)] mt-4">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-dim)] flex items-center gap-1.5">
            <FolderKanban className="h-3.5 w-3.5" /> Recent Projects
          </div>
          {projects.slice(0, 5).map(p => (
            <Link key={p.id} href={`/dashboard?project=${p.id}`}
              className="flex items-center gap-2.5 px-3 py-2.5 mx-1.5 rounded-lg text-[12px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-all duration-150 group truncate">
              <FolderKanban className="h-4 w-4 shrink-0 text-[var(--app-text-dim)] group-hover:text-[var(--ds-green)] transition-colors" />
              <span className="truncate flex-1 font-medium">{p.description || p.prompt || 'Untitled'}</span>
              <span className="shrink-0 text-[10px] text-[var(--app-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity">
                {fmtRelative(p.updated_at || p.created_at || '')}
              </span>
            </Link>
          ))}
        </div>
      )}

      {/* ── Project context ── */}
      {!collapsed && currentProject && (
        <div className="mt-4 pt-3 border-t border-[var(--app-border)]">
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)] flex items-center gap-1.5">
            <FolderKanban className="h-3 w-3" /> Project
          </div>
          <div className="px-2.5 py-2">
            <p className="text-[12px] font-medium text-[var(--app-text)] truncate">{currentProject.description || currentProject.prompt || 'Untitled'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9px] text-[var(--app-text-dim)]">{currentProject.stack || 'Web Builder'}</span>
              <span className="text-[9px] text-[var(--app-text-dim)]">•</span>
              <span className="text-[9px] text-[var(--app-text-dim)]">{fmtRelative(currentProject.updated_at || currentProject.created_at)}</span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <Link href={activeProjectId ? `/dashboard/settings?project=${activeProjectId}` : '/dashboard/settings'}
                className="inline-flex items-center gap-1 text-[10px] text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors">
                <Settings className="h-3 w-3" /> Settings
              </Link>
              {onMemoryOpen && (
                <button onClick={onMemoryOpen}
                  className="inline-flex items-center gap-1 text-[10px] text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors">
                  <Brain className="h-3 w-3" /> Memory
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Recent threads ── */}
      {!collapsed && (
        <div className={cn('pt-4', !currentProject && projects.length < 1 && 'mt-2')}>
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-dim)] flex items-center justify-between">
            <span className="flex items-center gap-1.5"><History className="h-3.5 w-3.5" /> Recent</span>
          </div>
          {recentThreads.length === 0 ? (
            <p className="px-3 py-2 text-[11px] text-[var(--app-text-dim)] italic">No history yet</p>
          ) : (
            recentThreads.map(t => (
              <ThreadRowItem
                key={t.id}
                thread={t}
                activeProjectId={activeProjectId}
                onRename={handleRenameThread}
                onDelete={handleDeleteThread}
              />
            ))
          )}
        </div>
      )}
    </>
  );

  // ══════════════════════════════════════════════════════════════════════
  //  MOBILE DRAWER
  // ══════════════════════════════════════════════════════════════════════
  const mobileDrawer = (
    <div className={cn(
      'fixed inset-0 z-50 md:hidden transition-opacity duration-300',
      mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
    )}>
      <div className={cn('absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
        mobileOpen ? 'opacity-100' : 'opacity-0')}
        onClick={handleMobileClose} />
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-[min(20rem,calc(100vw-2rem))] bg-[var(--app-panel)] shadow-2xl flex flex-col transition-transform duration-300 ease-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full')}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleDrawerTouchStart} onTouchMove={handleDrawerTouchMove}>
        <div className="h-[env(safe-area-inset-top)] shrink-0" />
        <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--app-border)] shrink-0">
          <Link href="/dashboard/home" onClick={handleMobileClose} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <BrandLockup logoClassName="h-8 w-8" textClassName="text-sm font-semibold" />
            <span className="sr-only">Workspace</span>
          </Link>
          <button onClick={handleMobileClose} className="touch-target rounded-lg flex items-center justify-center text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-all duration-150 active:scale-95"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-4 py-3 border-b border-[var(--app-border)] shrink-0">
          <Link href="/dashboard/home?create=1" onClick={handleMobileClose}
            className="flex min-h-11 items-center gap-2.5 px-4 py-3 rounded-lg text-[13px] font-semibold bg-[var(--ds-green)] text-white hover:bg-[var(--ds-green-bright)] transition-all duration-150 active:scale-95 shadow-sm hover:shadow-md touch-manipulation">
            <Plus className="h-4 w-4" /> New Project
          </Link>
        </div>
        <nav className="flex-1 py-2 px-3 space-y-0.5 overflow-y-auto">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)]">Main</p>
          {primaryItems.map(item => <NavLinkMobile key={item.key} item={item} onClick={handleMobileClose} />)}
          <div className="h-2" />
          <button onClick={() => setShowSecondary(!showSecondary)}
            className="w-full min-h-10 flex items-center gap-2 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)] touch-manipulation">
            Tools {showSecondary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showSecondary && secondaryItems.map(item => <NavLinkMobile key={item.key} item={item} onClick={handleMobileClose} />)}
          {/* Recent threads */}
          {recentThreads.length > 0 && (
            <>
              <div className="h-2 pt-4" />
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)]">
                <History className="h-3 w-3 inline mr-1.5" />Recent
              </p>
              {recentThreads.map(t => (
                <Link key={t.id} href={`/dashboard?project=${activeProjectId}&thread=${t.id}`} onClick={handleMobileClose}
                  className="flex min-h-11 items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors truncate touch-manipulation">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t.title || 'Untitled chat'}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-[var(--app-text-dim)]">{fmtRelative(t.updated_at || '')}</span>
                </Link>
              ))}
            </>
          )}
        </nav>
        <div className="border-t border-[var(--app-border)] py-3 px-3 space-y-0.5 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 text-[12px] text-[var(--app-text-muted)]">
            <Zap className="h-4 w-4 shrink-0" /> {credits === -1 ? 'Unlimited credits' : `${credits ?? 0} credits remaining`}
          </div>
          <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-full min-h-11 flex items-center gap-3 px-3 py-3 rounded-lg text-[13px] font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] active:scale-[0.98] touch-manipulation">
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="px-2 pt-1"><WorkspaceAccountMenu className="h-11 w-11" /></div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  //  DESKTOP SIDEBAR
  // ══════════════════════════════════════════════════════════════════════
  const desktopContent = (
    <>
      {/* Logo */}
      <div className={cn('h-16 flex items-center shrink-0 border-b border-[var(--app-border)] overflow-hidden',
        collapsed ? 'justify-center px-2' : 'px-2')}>
        <Link href="/dashboard/home" className={cn('flex items-center rounded-md hover:bg-[var(--app-surface)] transition-all duration-150',
          collapsed ? 'justify-center p-2' : 'p-[6px_10px]')}>
          <BrandLockup
            className={collapsed ? 'gap-0' : 'gap-3'}
            logoClassName="h-8 w-8"
            textClassName={cn('text-sm font-semibold whitespace-nowrap', collapsed && 'hidden')}
          />
        </Link>

        {/* Toggle button */}
        {variant === 'fixed' && !collapsed ? (
          <button
            onClick={onClose}
            className="ml-auto w-10 h-10 rounded-md flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all duration-150 shrink-0 touch-manipulation"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        ) : variant === 'fixed' && collapsed ? null : onToggleCollapsed ? (
          <button
            onClick={onToggleCollapsed}
            className={cn('w-10 h-10 rounded-md flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all duration-150 shrink-0 touch-manipulation',
              collapsed ? '' : 'ml-auto')}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        ) : null}
      </div>

      {/* Quick action + search */}
      {!collapsed && (
        <div className="shrink-0 border-b border-[var(--app-border)] px-3 py-3 space-y-2">
          <Link href="/dashboard/home?create=1" className={cn(
            'flex items-center rounded-lg bg-[var(--ds-green)] text-white hover:bg-[var(--ds-green-bright)] transition-all duration-150 active:scale-95 shadow-sm hover:shadow-md',
            'gap-2.5 px-3 py-2.5 text-[12px] font-semibold w-full justify-start')}
            title="New Project">
            <Plus className="h-4 w-4 shrink-0" />
            New Project
          </Link>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-text-dim)]" />
            <input value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)}
              placeholder="Search..." className="w-full h-11 md:h-9 rounded-md bg-[var(--app-surface)] border border-[var(--app-border)] pl-9 pr-10 text-[16px] md:text-[12px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--ds-green)]/50 focus:ring-1 focus:ring-[var(--ds-green)]/20 transition-all" />
            {sidebarSearch && (
              <button onClick={() => setSidebarSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 touch-target-sm flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-hidden overflow-y-auto">
        {navSection}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[var(--app-border)] py-3 px-2 space-y-1 shrink-0">
        <div className={cn('flex items-center text-[var(--app-text-muted)] rounded-lg transition-all duration-150 text-[12px] hover:bg-[var(--app-surface)]',
          collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2')}>
          <Zap className="shrink-0 h-4 w-4 text-[var(--app-text-dim)]" />
          {!collapsed && <span className="truncate font-medium">{credits === -1 ? 'Unlimited' : `${credits ?? 0} credits`}</span>}
        </div>
        <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={cn('rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all duration-150 text-[12px] font-medium',
            collapsed ? 'p-2 w-full flex justify-center' : 'flex items-center gap-3 px-3 py-2 w-full')}>
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && (resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode')}
        </button>
        {collapsed ? (
          <Link href="/dashboard/settings"
            className="w-9 h-9 rounded-[6px] bg-[var(--ds-green)] flex items-center justify-center text-[11px] font-bold text-white hover:bg-[var(--ds-green-bright)] transition-all duration-150 shadow-sm mx-auto"
            title={user?.email || 'User settings'}>
            {user?.email?.[0].toUpperCase() || 'U'}
          </Link>
        ) : (
          <div className="px-3 py-2"><WorkspaceAccountMenu /></div>
        )}
      </div>
    </>
  );

  // ── Inline variant: always rendered, collapsible ──
  if (variant === 'inline') {
    return (
      <>
        <ConfirmDialogComponent />
        <aside
          className={`hidden md:flex shrink-0 flex-col h-full bg-[var(--app-panel)] border-r border-[var(--app-border)] transition-all duration-200 ${
            collapsed ? 'w-16' : 'w-72'
          }`}
        >
          {desktopContent}
        </aside>
        {mobileDrawer}
      </>
    );
  }

  // ── Fixed variant: overlay, hidden by default ──
  const desktopRail = (
    <div
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-72 flex-col bg-[var(--app-panel)] border-r border-[var(--app-border)] select-none">
      {desktopContent}
    </div>
  );

  return (
    <>
      <ConfirmDialogComponent />
      {isOpen && desktopRail}
      {isOpen && mobileDrawer}
    </>
  );
}

// ── Relative time formatter ──
function fmtRelative(iso: string): string {
  if (!iso) return '';
  try { return formatDistanceToNowStrict(new Date(iso), { addSuffix: true }); }
  catch { return ''; }
}

// ════════════════════════════════════════════════════════════════════════
//  Thread Row (with rename/delete actions)
// ════════════════════════════════════════════════════════════════════════
function ThreadRowItem({ thread, activeProjectId, onRename, onDelete }: {
  thread: ThreadRow;
  activeProjectId: string;
  onRename: (t: ThreadRow) => void;
  onDelete: (t: ThreadRow) => void;
}) {
  const isTouchDevice = useMediaQuery('(hover: none) and (pointer: coarse)');
  const actionBtnClass = isTouchDevice
    ? 'inline-flex h-10 w-10 md:h-7 md:w-7 rounded-[6px] items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all duration-150 touch-manipulation'
    : 'hidden group-hover:inline-flex h-10 w-10 md:h-7 md:w-7 rounded-[6px] items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all duration-150 touch-manipulation';

  const title = (thread.title || '').trim() || 'New thread';
  const href = thread.project_id
    ? `/dashboard?project=${thread.project_id}&thread=${thread.id}`
    : activeProjectId
    ? `/dashboard?project=${activeProjectId}&thread=${thread.id}`
    : `/dashboard?thread=${thread.id}`;

  return (
    <div className="group flex items-center gap-1 px-1.5 py-0.5">
      <Link href={href}
        className="flex-1 min-h-11 md:min-h-0 flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-all duration-150 min-w-0 touch-manipulation">
        <MessageSquare className="h-4 w-4 shrink-0 text-[var(--app-text-dim)] group-hover:text-[var(--ds-green)] transition-colors" />
        <span className="flex-1 min-w-0 truncate font-medium">{title}</span>
        <span className="shrink-0 text-[10px] text-[var(--app-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity"
          title={thread.updated_at ? new Date(thread.updated_at).toLocaleString() : undefined}>
          {fmtRelative(thread.updated_at || thread.created_at || '')}
        </span>
      </Link>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRename(thread); }}
        className={actionBtnClass}
        aria-label="Rename thread"
        title="Rename"
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(thread); }}
        className={actionBtnClass.replace('hover:text-[var(--app-text)]', 'hover:text-[var(--app-danger)]')}
        aria-label="Delete thread"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Desktop Nav Link (with drag-drop, badge, active indicator)
// ════════════════════════════════════════════════════════════════════════
function NavLinkDesktop({ item, expanded, onDragStart, onDragOver, onDrop, isDragOver, isDragging, showGrip }: {
  item: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; shortcut?: string; badge?: number };
  expanded: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  isDragging?: boolean;
  showGrip?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.href}
      draggable={!!onDragStart}
      onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      title={expanded ? undefined : `${item.label}${item.shortcut ? ` (⌘${item.shortcut})` : ''}`}
      className={cn(
        'flex items-center rounded-lg transition-all duration-150 whitespace-nowrap group relative touch-manipulation',
        expanded ? 'gap-3 px-3 py-3 md:py-2' : 'justify-center w-11 h-11 md:w-10 md:h-10 mx-auto',
        item.active ? 'bg-[var(--ds-green-muted)] text-[var(--ds-green)] border border-[var(--ds-green)]/20'
          : isDragOver ? 'bg-[var(--ds-green)]/10 border border-dashed border-[var(--ds-green)]/30'
          : isDragging ? 'opacity-40'
          : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
      )}>
      {showGrip && (
        <span className="shrink-0 text-[var(--app-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3 w-3" />
        </span>
      )}
      <Icon className="h-4.5 w-4.5 shrink-0" />
      {expanded && (
        <span className="text-sm font-semibold truncate flex-1">{item.label}</span>
      )}
      {expanded && item.shortcut && (
        <kbd className="hidden group-hover:inline-flex items-center h-4 px-1 rounded-[3px] bg-[var(--app-panel-2)] border border-[var(--app-border)] text-[9px] font-mono text-[var(--app-text-dim)] shrink-0">
          ⌘{item.shortcut}
        </kbd>
      )}
      {item.badge && item.badge > 0 ? (
        <span className={cn(
          'rounded-full bg-[var(--ds-green)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm',
          expanded ? 'h-5 min-w-[20px] px-1.5' : 'absolute -top-1 -right-1 h-4 w-4 text-[8px]')}>
          {item.badge}
        </span>
      ) : null}
      {item.active && !expanded && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-[var(--ds-green)]" />
      )}
    </Link>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Mobile Nav Link
// ════════════════════════════════════════════════════════════════════════
function NavLinkMobile({ item, onClick }: {
  item: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; badge?: number };
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onClick}
      className={cn('flex min-h-11 items-center gap-3 px-3 py-3 rounded-lg text-[13px] font-medium transition-colors active:scale-[0.98] touch-manipulation',
        item.active ? 'bg-[var(--app-surface)] text-[var(--app-text)]' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]')}>
      <Icon className="h-5 w-5 shrink-0" />
      {item.label}
      {item.active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]" />}
      {item.badge && item.badge > 0 && (
        <span className="ml-auto rounded-full bg-[var(--app-accent)] text-white text-[10px] font-bold h-4 min-w-[16px] px-1 flex items-center justify-center">{item.badge}</span>
      )}
    </Link>
  );
}
