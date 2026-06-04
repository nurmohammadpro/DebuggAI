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
  FolderKanban,
  GripVertical,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { useMyThreads } from '@/hooks/queries/use-my-threads';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';

interface WorkspaceSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Workspace sidebar — v0-style single sidebar.
 *
 * Hidden by default. When opened, it shows navigation, recent items,
 * and can be collapsed with the button beside the logo.
 */
export function WorkspaceSidebar({ isOpen, onClose }: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useSessionStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const touchStartX = useRef(0);
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
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
  };
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches[0]!.clientX - touchStartX.current < -60) setMobileOpen(false);
  }, []);

  // ── Escape ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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
        <div className="flex items-center justify-between h-16 px-5 border-b border-[var(--app-border)] shrink-0">
          <Link href="/dashboard/home" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-[var(--ds-green)] flex items-center justify-center shadow-sm"><span className="text-xs font-black text-white">D</span></div>
            <div><span className="text-sm font-bold text-[var(--app-text)]">DeBuggAI</span><span className="block text-[10px] text-[var(--app-text-dim)]">Workspace</span></div>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-all duration-150 active:scale-95"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-4 py-3 border-b border-[var(--app-border)] shrink-0">
          <Link href="/dashboard?create=1" onClick={() => setMobileOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-[13px] font-semibold bg-[var(--ds-green)] text-white hover:bg-[var(--ds-green-bright)] transition-all duration-150 active:scale-95 shadow-sm hover:shadow-md">
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
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-72 flex-col bg-[var(--app-panel)] border-r border-[var(--app-border)] select-none">
      {/* Logo */}
      <div className="h-16 flex items-center shrink-0 border-b border-[var(--app-border)] overflow-hidden px-2">
        <Link href="/dashboard/home" className="flex items-center rounded-md hover:bg-[var(--app-surface)] transition-all duration-150"
          style={{ padding: '6px 10px' }}>
          <div className="w-8 h-8 rounded-lg bg-[var(--ds-green)] flex items-center justify-center shrink-0 shadow-sm"><span className="text-[12px] font-black text-white">D</span></div>
          <div className="ml-3 overflow-hidden transition-opacity duration-200">
            <span className="text-sm font-bold text-[var(--app-text)] whitespace-nowrap">DeBuggAI</span>
            <span className="block text-[10px] text-[var(--app-text-dim)] -mt-0.5">Workspace</span>
          </div>
        </Link>
        <button
          onClick={onClose}
          className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all duration-150 shrink-0"
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Quick action + search */}
      <div className="shrink-0 border-b border-[var(--app-border)] px-3 py-3 space-y-2">
        <Link href="/dashboard?create=1" className={cn(
          'flex items-center rounded-lg bg-[var(--ds-green)] text-white hover:bg-[var(--ds-green-bright)] transition-all duration-150 active:scale-95 shadow-sm hover:shadow-md',
          'gap-2.5 px-3 py-2.5 text-[12px] font-semibold w-full justify-start')}
          title="New Project">
          <Plus className="h-4 w-4 shrink-0" />
          New Project
        </Link>
        {/* Search bar (P3) */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-text-dim)]" />
          <input value={sidebarSearch} onChange={e => setSidebarSearch(e.target.value)}
            placeholder="Search..." className="w-full h-9 rounded-md bg-[var(--app-surface)] border border-[var(--app-border)] pl-9 pr-8 text-[12px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--ds-green)]/50 focus:ring-1 focus:ring-[var(--ds-green)]/20 transition-all" />
          {sidebarSearch && (
            <button onClick={() => setSidebarSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-hidden overflow-y-auto">
        {/* Primary nav */}
        {filteredPrimary.map(item => (
          <NavLinkDesktop key={item.key} item={item} expanded={true}
            onDragStart={(e) => handleDragStart(e, item.key)}
            onDragOver={(e) => handleDragOverSlot(e, item.key)}
            onDrop={(e) => handleDrop(e, item.key)}
            isDragOver={dragOver === item.key} isDragging={dragging === item.key}
            showGrip={true} />
        ))}

        {/* Separator */}
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

        {/* ── Project context (P1) ── */}
        {currentProject && (
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
        {recentThreads.length > 0 && (
          <div className={cn('pt-4', !currentProject && 'mt-4 border-t border-[var(--app-border)]')}>
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[var(--app-text-dim)] flex items-center gap-1.5">
              <History className="h-3.5 w-3.5" /> Recent
            </div>
            {recentThreads.map(t => (
              <Link key={t.id} href={`/dashboard?project=${activeProjectId}&thread=${t.id}`}
                className="flex items-center gap-2.5 px-3 py-2.5 mx-1.5 rounded-lg text-[12px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-all duration-150 group truncate">
                <MessageSquare className="h-4 w-4 shrink-0 text-[var(--app-text-dim)] group-hover:text-[var(--ds-green)] transition-colors" />
                <span className="truncate flex-1 font-medium">{t.title || 'Untitled chat'}</span>
                <span className="shrink-0 text-[10px] text-[var(--app-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t.updated_at ? new Date(t.updated_at).toLocaleString() : undefined}>
                  {fmtRelative(t.updated_at)}
                </span>
              </Link>
            ))}
            {threads.length < 1 && (
              <p className="px-3 py-2 text-[11px] text-[var(--app-text-dim)] italic">No history yet</p>
            )}
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[var(--app-border)] py-3 px-2 space-y-1 shrink-0">
        <div className="flex items-center text-[var(--app-text-muted)] rounded-lg transition-all duration-150 gap-3 px-3 py-2 text-[12px] hover:bg-[var(--app-surface)]">
          <Zap className="shrink-0 h-4 w-4 text-[var(--app-text-dim)]" />
          <span className="truncate font-medium">{credits === -1 ? 'Unlimited' : `${credits ?? 0} credits`}</span>
        </div>
        <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all duration-150 flex items-center gap-3 px-3 py-2 w-full text-[12px] font-medium">
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="px-3 py-2"><WorkspaceAccountMenu /></div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--app-panel)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all duration-150 shadow-lg active:scale-95 touch-manipulation"
        onClick={() => setMobileOpen(true)} aria-label="Open menu">
        <PanelLeft className="w-5 h-5" />
      </button>
      {isOpen && desktopRail}
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
        'flex items-center rounded-lg transition-all duration-150 whitespace-nowrap group relative',
        expanded ? 'gap-3 px-3 py-2' : 'justify-center w-10 h-10 mx-auto',
        item.active ? 'bg-[var(--ds-green-muted)] text-[var(--ds-green)] border border-[var(--ds-green)]/20'
          : isDragOver ? 'bg-[var(--ds-green)]/10 border border-dashed border-[var(--ds-green)]/30'
          : isDragging ? 'opacity-40'
          : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
      )}>
      {/* Drag grip (P2) */}
      {showGrip && (
        <span className="shrink-0 text-[var(--app-text-dim)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
          <GripVertical className="h-3 w-3" />
        </span>
      )}
      <Icon className="h-4.5 w-4.5 shrink-0" />
      {expanded && (
        <span className="text-sm font-semibold truncate flex-1">{item.label}</span>
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
          'rounded-full bg-[var(--ds-green)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm',
          expanded ? 'h-5 min-w-[20px] px-1.5' : 'absolute -top-1 -right-1 h-4 w-4 text-[8px]')}>
          {item.badge}
        </span>
      ) : null}
      {/* Active indicator dot (collapsed) */}
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
