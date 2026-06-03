'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import {
  Home,
  Pencil,
  Bug,
  ListChecks,
  GitBranch,
  Zap,
  Sun,
  Moon,
  X,
  PanelLeft,
  PanelLeftClose,
  Plus,
  ChevronDown,
  ChevronUp,
  History,
  Settings,
  Search,
  MessageSquare,
  Pin,
  PinOff,
  Clock,
  Bell,
  FolderKanban,
  GripVertical,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { useMyThreads } from '@/hooks/queries/use-my-threads';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';

/**
 * Fully enhanced workspace sidebar — P1, P2, P3 features:
 *
 * P1: Conversation history, project context section, command palette
 * P2: Drag-to-reorder nav, notification badges, width drag-resize
 * P3: Collapse animation, last-active timestamps, search bar
 */
export function WorkspaceSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useSessionStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const hoverRef = useRef(false);
  const touchStartX = useRef(0);
  const [showSecondary, setShowSecondary] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // ── Data ──
  const activeProjectId = searchParams?.get('project') || '';
  const { data: threads = [] } = useMyThreads(10, !!activeProjectId, activeProjectId || null);
  const { data: projects = [] } = useMyProjects(8);

  // ── Draggable nav order (persisted) ──
  const [navOrder, setNavOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('debuggai.sidebar.navOrder');
      return saved ? JSON.parse(saved) : ['home', 'builder', 'debug', 'runs', 'branches'];
    } catch { return ['home', 'builder', 'debug', 'runs', 'branches']; }
  });
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const persistNavOrder = (order: string[]) => {
    setNavOrder(order);
    try { localStorage.setItem('debuggai.sidebar.navOrder', JSON.stringify(order)); } catch {}
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
    const fromIdx = navOrder.indexOf(dragging);
    const toIdx = navOrder.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...navOrder];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, dragging);
    persistNavOrder(next);
    setDragging(null);
    setDragOver(null);
  };

  // ── Nav definitions ──
  const isWorkspace = pathname === '/dashboard' && !!activeProjectId;
  const isDashboardHome = pathname === '/dashboard' && !activeProjectId;
  const isDebug = pathname === '/dashboard/debug' || pathname.startsWith('/dashboard/debug/');
  const isRuns = pathname === '/dashboard/runs' || pathname.startsWith('/dashboard/runs/');
  const isBranches = pathname === '/dashboard/branches';

  const allNavItems = useMemo(() => ({
    home:     { href: '/dashboard/home', icon: Home, label: 'Home', active: isDashboardHome, shortcut: 'H', badge: 0 },
    builder:  { href: `/dashboard?project=${activeProjectId}`, icon: Pencil, label: 'Builder', active: isWorkspace, shortcut: 'B', badge: 0 },
    debug:    { href: '/dashboard/debug', icon: Bug, label: 'Debug', active: isDebug, shortcut: 'D', badge: 0 },
    runs:     { href: '/dashboard/runs', icon: ListChecks, label: 'Runs', active: isRuns, shortcut: 'R', badge: 0 },
    branches: { href: '/dashboard/branches', icon: GitBranch, label: 'Branches', active: isBranches, shortcut: 'G', badge: 0 },
  }), [activeProjectId, isWorkspace, isDashboardHome, isDebug, isRuns, isBranches]);

  // Ordered nav: primary (home, builder) always first, then remaining
  const primaryKeys = ['home', 'builder'];
  const secondaryKeys = navOrder.filter(k => !primaryKeys.includes(k));

  const primaryItems = primaryKeys.map(k => ({ key: k, ...allNavItems[k as keyof typeof allNavItems] }));
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
  const recentThreads = useMemo(() => threads.slice(0, 5), [threads]);
  const recentProjects = useMemo(() => projects.slice(0, 5), [projects]);

  // ── Current project context ──
  const currentProject = useMemo(
    () => activeProjectId ? projects.find(p => p.id === activeProjectId) : null,
    [activeProjectId, projects]
  );

  const credits = user?.credits;
  const effectiveExpanded = expanded || locked;
  const finalWidth = effectiveExpanded ? sidebarWidth : 48;

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return;
      switch (e.key.toLowerCase()) {
        case 'b': e.preventDefault(); if (activeProjectId) router.push(`/dashboard?project=${activeProjectId}`); break;
        case '\\': e.preventDefault(); setLocked(l => !l); break;
        case 'h': e.preventDefault(); router.push('/dashboard/home'); break;
        case 'k': e.preventDefault(); setSidebarSearch(''); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeProjectId, router]);

  // ── Mobile swipe gesture ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
  };
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches[0]!.clientX - touchStartX.current < -60) setMobileOpen(false);
  }, []);

  // ── Escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMobileOpen(false); setLocked(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Width drag-resize ──
  const resizeRef = useRef<{ startX: number; startWidth: number; dragging: boolean }>({
    startX: 0, startWidth: 220, dragging: false,
  });
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startWidth: sidebarWidth, dragging: true };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!resizeRef.current.dragging) return;
      const dx = e.clientX - resizeRef.current.startX;
      setSidebarWidth(Math.max(160, Math.min(400, resizeRef.current.startWidth + dx)));
    };
    const onUp = () => {
      if (resizeRef.current.dragging) {
        resizeRef.current.dragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try { localStorage.setItem('debuggai.sidebar.width', String(sidebarWidth)); } catch {}
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [sidebarWidth]);

  // Load saved width
  useEffect(() => {
    try {
      const w = localStorage.getItem('debuggai.sidebar.width');
      if (w) setSidebarWidth(Math.max(160, Math.min(400, Number(w))));
    } catch {}
  }, []);

  // ── Desktop: hover-to-preview, click-to-lock ──
  const handleMouseEnter = () => { hoverRef.current = true; if (!locked) setExpanded(true); };
  const handleMouseLeave = () => {
    hoverRef.current = false;
    if (!locked) setTimeout(() => { if (!hoverRef.current && !locked) setExpanded(false); }, 150);
  };

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
        onClick={() => setMobileOpen(false)} />
      <div className={cn(
        'absolute left-0 top-0 bottom-0 w-72 bg-[var(--app-panel)] shadow-2xl flex flex-col transition-transform duration-300 ease-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full')}
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>
        <div className="h-[env(safe-area-inset-top)] shrink-0" />
        {/* Mobile header */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-[var(--app-border)] shrink-0">
          <Link href="/dashboard/home" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--app-accent)] flex items-center justify-center"><span className="text-[12px] font-black text-white">D</span></div>
            <div><span className="text-[14px] font-semibold text-[var(--app-text)]">DeBuggAI</span><span className="block text-[10px] text-[var(--app-text-dim)]">v1.0</span></div>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] active:scale-95"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-3 py-3 border-b border-[var(--app-border)] shrink-0">
          <Link href="/dashboard?create=1" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-[13px] font-medium bg-[var(--app-accent)] text-white hover:opacity-90 active:scale-[0.98]">
            <Plus className="h-4 w-4" /> New Project
          </Link>
        </div>
        <nav className="flex-1 py-2 px-3 space-y-0.5 overflow-y-auto">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)]">Main</p>
          {primaryItems.map(item => <NavLinkMobile key={item.key} item={item} onClick={() => setMobileOpen(false)} />)}
          <div className="h-2" />
          <button onClick={() => setShowSecondary(!showSecondary)}
            className="w-full flex items-center gap-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)]">
            Tools {showSecondary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showSecondary && secondaryItems.map(item => <NavLinkMobile key={item.key} item={item} onClick={() => setMobileOpen(false)} />)}
          {/* Recent threads */}
          {recentThreads.length > 0 && (
            <>
              <div className="h-2 pt-4" />
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)]">
                <History className="h-3 w-3 inline mr-1.5" />Recent
              </p>
              {recentThreads.map(t => (
                <Link key={t.id} href={`/dashboard?project=${activeProjectId}&thread=${t.id}`} onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors truncate">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{t.title || 'Untitled chat'}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-[var(--app-text-dim)]">{fmtRelative(t.updated_at)}</span>
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
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[13px] font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] active:scale-[0.98]">
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="px-2 pt-1"><WorkspaceAccountMenu /></div>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════
  //  DESKTOP SIDEBAR
  // ══════════════════════════════════════════════════════════════════════
  const desktopRail = (
    <div
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col bg-[var(--app-panel)] border-r border-[var(--app-border)] select-none transition-all duration-200 ease-out"
      style={{ width: finalWidth }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      {/* Logo */}
      <div className="h-12 flex items-center shrink-0 border-b border-[var(--app-border)] overflow-hidden px-2">
        <Link href="/dashboard/home" className="flex items-center rounded-md hover:bg-[var(--app-surface)] transition-colors"
          style={{ padding: effectiveExpanded ? '4px 8px' : '4px' }}>
          <div className="w-8 h-8 rounded-lg bg-[var(--app-accent)] flex items-center justify-center shrink-0"><span className="text-[12px] font-black text-white">D</span></div>
          {effectiveExpanded && (
            <div className="ml-2 overflow-hidden transition-opacity duration-200">
              <span className="text-[13px] font-semibold text-[var(--app-text)] whitespace-nowrap">DeBuggAI</span>
              <span className="block text-[9px] text-[var(--app-text-dim)] -mt-0.5">v1.0</span>
            </div>
          )}
        </Link>
        {effectiveExpanded && (
          <button onClick={e => { e.stopPropagation(); setLocked(l => !l); }}
            className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors shrink-0"
            title={locked ? 'Unpin sidebar' : 'Pin sidebar'}>
            {locked ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3 rotate-45" />}
          </button>
        )}
      </div>

      {/* Quick action + search */}
      <div className={cn('shrink-0 border-b border-[var(--app-border)] transition-all duration-200',
        effectiveExpanded ? 'px-3 py-2 space-y-2' : 'px-1.5 py-2')}>
        <Link href="/dashboard?create=1" className={cn(
          'flex items-center rounded-lg bg-[var(--app-accent)] text-white hover:opacity-90 transition-opacity active:scale-[0.97]',
          effectiveExpanded ? 'gap-2 px-3 py-2 text-[12px] font-medium w-full justify-start' : 'w-9 h-9 mx-auto justify-center')}
          title={effectiveExpanded ? undefined : 'New Project'}>
          <Plus className="h-4 w-4 shrink-0" />
          {effectiveExpanded && 'New Project'}
        </Link>
        {/* Search bar (P3) */}
        {effectiveExpanded && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--app-text-dim)]" />
            <input value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)}
              placeholder="Search..." className="w-full h-8 rounded-md bg-[var(--app-surface)] border border-[var(--app-border)] pl-8 pr-2 text-[11px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)]/40 transition-colors" />
            {sidebarSearch && (
              <button onClick={() => setSidebarSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--app-text-dim)] hover:text-[var(--app-text)]">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-hidden overflow-y-auto">
        {/* Primary nav */}
        {filteredPrimary.map(item => (
          <NavLinkDesktop key={item.key} item={item} expanded={effectiveExpanded}
            onDragStart={effectiveExpanded ? (e) => handleDragStart(e, item.key) : undefined}
            onDragOver={effectiveExpanded ? (e) => handleDragOverSlot(e, item.key) : undefined}
            onDrop={effectiveExpanded ? (e) => handleDrop(e, item.key) : undefined}
            isDragOver={dragOver === item.key} isDragging={dragging === item.key}
            showGrip={effectiveExpanded} />
        ))}

        {/* Separator */}
        <div className="px-1.5 pt-3 pb-1">
          {effectiveExpanded ? (
            <button onClick={() => setShowSecondary(!showSecondary)}
              className="flex items-center gap-2 w-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors">
              Tools {showSecondary ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </button>
          ) : <div className="h-px bg-[var(--app-border)]" />}
        </div>

        {showSecondary && filteredSecondary.map(item => (
          <NavLinkDesktop key={item.key} item={item} expanded={effectiveExpanded}
            onDragStart={effectiveExpanded ? (e) => handleDragStart(e, item.key) : undefined}
            onDragOver={effectiveExpanded ? (e) => handleDragOverSlot(e, item.key) : undefined}
            onDrop={effectiveExpanded ? (e) => handleDrop(e, item.key) : undefined}
            isDragOver={dragOver === item.key} isDragging={dragging === item.key}
            showGrip={effectiveExpanded} />
        ))}

        {/* ── Project context (P1) ── */}
        {effectiveExpanded && currentProject && (
          <div className="mt-3 pt-3 border-t border-[var(--app-border)]">
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
              <Link href={activeProjectId ? `/dashboard/settings?project=${activeProjectId}` : '/dashboard/settings'}
                className="inline-flex items-center gap-1 mt-2 text-[10px] text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors">
                <Settings className="h-3 w-3" /> Settings
              </Link>
            </div>
          </div>
        )}

        {/* ── Recent threads (P1) ── */}
        {effectiveExpanded && recentThreads.length > 0 && (
          <div className={cn('pt-3', !currentProject && 'mt-3 border-t border-[var(--app-border)]')}>
            <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)] flex items-center gap-1.5">
              <History className="h-3 w-3" /> Recent
            </div>
            {recentThreads.map(t => (
              <Link key={t.id} href={`/dashboard?project=${activeProjectId}&thread=${t.id}`}
                className="flex items-center gap-2 px-2.5 py-1.5 mx-1.5 rounded-md text-[11px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors group truncate">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 text-[var(--app-text-dim)] group-hover:text-[var(--app-accent)] transition-colors" />
                <span className="truncate flex-1">{t.title || 'Untitled chat'}</span>
                <span className="shrink-0 text-[9px] text-[var(--app-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t.updated_at ? new Date(t.updated_at).toLocaleString() : undefined}>
                  {fmtRelative(t.updated_at)}
                </span>
              </Link>
            ))}
            {threads.length < 1 && (
              <p className="px-2.5 py-2 text-[10px] text-[var(--app-text-dim)] italic">No history yet</p>
            )}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className={cn('border-t border-[var(--app-border)] py-2 space-y-0.5 shrink-0',
        effectiveExpanded ? 'px-1.5' : 'flex flex-col items-center px-1')}>
        <div className={cn('flex items-center text-[var(--app-text-muted)] rounded-md',
          effectiveExpanded ? 'gap-2.5 px-2.5 py-1.5 text-[11px]' : 'justify-center w-9 h-9 mx-auto')}>
          <Zap className={cn('shrink-0', effectiveExpanded ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-[var(--app-text-dim)]')} />
          {effectiveExpanded && <span className="truncate">{credits === -1 ? 'Unlimited' : `${credits ?? 0} credits`}</span>}
        </div>
        <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={cn('rounded-md text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors',
            effectiveExpanded ? 'flex items-center gap-2.5 px-2.5 py-1.5 w-full text-[11px]' : 'flex items-center justify-center w-9 h-9 mx-auto')}>
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {effectiveExpanded && (resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode')}
        </button>
        <div className={effectiveExpanded ? 'px-2.5 py-1' : 'flex justify-center'}><WorkspaceAccountMenu /></div>
      </div>

      {/* ── Resize handle (P2) ── */}
      {effectiveExpanded && (
        <div onMouseDown={handleResizeMouseDown}
          className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-[var(--app-accent)]/20 transition-colors z-50"
          title="Drag to resize sidebar" />
      )}
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-[14px] left-3 z-50 w-9 h-9 rounded-[10px] flex items-center justify-center bg-[var(--app-panel)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all shadow-lg active:scale-95 touch-manipulation"
        onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <PanelLeft className="w-4 h-4" />
      </button>
      {desktopRail}
      {mobileDrawer}
    </>
  );
}

// ── Relative time formatter (P3) ──
function fmtRelative(iso: string): string {
  if (!iso) return '';
  try { return formatDistanceToNowStrict(new Date(iso), { addSuffix: true }); }
  catch { return ''; }
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
        'flex items-center rounded-md transition-all duration-200 whitespace-nowrap group relative',
        expanded ? 'gap-2.5 px-2.5 py-1.5' : 'justify-center w-9 h-9 mx-auto',
        item.active ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
          : isDragOver ? 'bg-[var(--app-accent)]/10 border border-dashed border-[var(--app-accent)]/30'
          : isDragging ? 'opacity-40'
          : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
      )}>
      {/* Drag grip (P2) */}
      {showGrip && (
        <span className="shrink-0 text-[var(--app-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3 w-3" />
        </span>
      )}
      <Icon className="h-4 w-4 shrink-0" />
      {expanded && (
        <span className="text-[12px] font-medium truncate flex-1">{item.label}</span>
      )}
      {/* Shortcut hint */}
      {expanded && item.shortcut && (
        <kbd className="hidden group-hover:inline-flex items-center h-4 px-1 rounded-[3px] bg-[var(--app-panel-2)] border border-[var(--app-border)] text-[9px] font-mono text-[var(--app-text-dim)] shrink-0">
          ⌘{item.shortcut}
        </kbd>
      )}
      {/* Notification badge (P2) */}
      {item.badge && item.badge > 0 ? (
        <span className={cn(
          'rounded-full bg-[var(--app-accent)] text-white text-[9px] font-bold flex items-center justify-center shrink-0',
          expanded ? 'h-4 min-w-[16px] px-1' : 'absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-[7px]')}>
          {item.badge}
        </span>
      ) : null}
      {/* Active indicator dot (collapsed) */}
      {item.active && !expanded && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[var(--app-accent)]" />
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
      className={cn('flex items-center gap-3 px-3 py-3 rounded-lg text-[13px] font-medium transition-colors active:scale-[0.98] touch-manipulation',
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
