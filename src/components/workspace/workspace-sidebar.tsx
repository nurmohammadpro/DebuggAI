'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
  Command,
  ChevronDown,
  ChevronUp,
  History,
  Settings,
  FolderKanban,
  MessageSquare,
  Pin,
  PinOff,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { cn } from '@/lib/utils';

/**
 * Enhanced workspace sidebar with:
 * - Desktop: click-to-lock expand, smooth transitions, quick actions
 * - Mobile: swipe gesture, animated backdrop, safe-area support
 * - Active project indicator, keyboard shortcut hints
 */
export function WorkspaceSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSessionStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [locked, setLocked] = useState(false);
  const hoverRef = useRef(false);
  const touchStartX = useRef(0);

  const activeProjectId = searchParams?.get('project') || '';

  const isWorkspace = pathname === '/dashboard' && !!activeProjectId;
  const isDashboardHome = pathname === '/dashboard' && !activeProjectId;
  const isDebug = pathname === '/dashboard/debug' || pathname.startsWith('/dashboard/debug/');
  const isRuns = pathname === '/dashboard/runs' || pathname.startsWith('/dashboard/runs/');
  const isBranches = pathname === '/dashboard/branches';

  // Primary nav (always visible)
  const primaryItems = [
    { href: '/dashboard/home', icon: Home, label: 'Home', active: isDashboardHome, shortcut: 'H' },
    { href: `/dashboard?project=${activeProjectId}`, icon: Pencil, label: 'Builder', active: isWorkspace, shortcut: 'B' },
  ];

  // Secondary nav (collapsible — tools)
  const secondaryItems = [
    { href: '/dashboard/debug', icon: Bug, label: 'Debug', active: isDebug, shortcut: 'D' },
    { href: '/dashboard/runs', icon: ListChecks, label: 'Runs', active: isRuns, shortcut: 'R' },
    { href: '/dashboard/branches', icon: GitBranch, label: 'Branches', active: isBranches, shortcut: 'G' },
  ];

  const [showSecondary, setShowSecondary] = useState(false);
  const credits = user?.credits;
  const effectiveExpanded = expanded || locked;

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'b': e.preventDefault(); if (activeProjectId) window.location.href = `/dashboard?project=${activeProjectId}`; break;
          case '\\': e.preventDefault(); setLocked(l => !l); break;
          case 'h': e.preventDefault(); window.location.href = '/dashboard/home'; break;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeProjectId]);

  // ── Swipe gesture for mobile drawer ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
  };
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0]!.clientX - touchStartX.current;
    if (dx < -60) {
      setMobileOpen(false);
    }
  }, []);

  // ── Escape to close ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setLocked(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Desktop: hover-to-preview, click-to-lock ──
  const handleMouseEnter = () => {
    hoverRef.current = true;
    if (!locked) setExpanded(true);
  };
  const handleMouseLeave = () => {
    hoverRef.current = false;
    if (!locked) {
      // Small delay so accidental cursor exits don't collapse
      setTimeout(() => {
        if (!hoverRef.current && !locked) setExpanded(false);
      }, 150);
    }
  };
  const handleLockToggle = () => {
    setLocked(l => !l);
    if (!locked) setExpanded(true);
  };

  const sidebarWidth = effectiveExpanded ? 220 : 48;

  // ── Mobile hamburger (top-left, avoid overlapping with top bar) ──
  const hamburger = (
    <button
      className="md:hidden fixed top-[14px] left-3 z-50 w-9 h-9 rounded-[10px] flex items-center justify-center bg-[var(--app-panel)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all shadow-lg active:scale-95 touch-manipulation"
      onClick={() => setMobileOpen(true)}
      aria-label="Open menu"
    >
      <PanelLeft className="w-4 h-4" />
    </button>
  );

  // ── Mobile drawer (animated backdrop + slide-in) ──
  const mobileDrawer = (
    <div
      className={cn(
        'fixed inset-0 z-50 md:hidden transition-opacity duration-300',
        mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      )}
    >
      {/* Animated backdrop */}
      <div
        className={cn(
          'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          mobileOpen ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => setMobileOpen(false)}
      />
      {/* Slide-in panel */}
      <div
        className={cn(
          'absolute left-0 top-0 bottom-0 w-72 bg-[var(--app-panel)] shadow-2xl flex flex-col transition-transform duration-300 ease-out',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Safe area top for notched phones */}
        <div className="h-[env(safe-area-inset-top)] shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between h-14 px-5 border-b border-[var(--app-border)] shrink-0">
          <Link href="/dashboard/home" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--app-accent)] flex items-center justify-center shrink-0">
              <span className="text-[12px] font-black text-white leading-none">D</span>
            </div>
            <div>
              <span className="text-[14px] font-semibold text-[var(--app-text)]">DeBuggAI</span>
              <span className="block text-[10px] text-[var(--app-text-dim)] -mt-0.5">v1.0</span>
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors active:scale-95 touch-manipulation"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Actions */}
        <div className="px-3 py-3 space-y-1.5 border-b border-[var(--app-border)] shrink-0">
          <Link
            href={`/dashboard?create=1`}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-lg text-[13px] font-medium bg-[var(--app-accent)] text-white hover:opacity-90 transition-opacity active:scale-[0.98] touch-manipulation"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-3 space-y-0.5 overflow-y-auto">
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)]">Main</p>
          {primaryItems.map((item) => (
            <NavLinkMobile key={item.label} item={item} onClick={() => setMobileOpen(false)} />
          ))}

          <div className="h-2" />
          <button
            onClick={() => setShowSecondary(!showSecondary)}
            className="w-full flex items-center gap-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors"
          >
            Tools
            {showSecondary ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {showSecondary && secondaryItems.map((item) => (
            <NavLinkMobile key={item.label} item={item} onClick={() => setMobileOpen(false)} />
          ))}

          {/* Recent section placeholder */}
          <div className="h-2 pt-4" />
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)]">
            <History className="h-3 w-3 inline mr-1.5 -mt-0.5" />Recent
          </p>
          <div className="px-2 py-3 text-[11px] text-[var(--app-text-dim)] italic">
            Your recent projects will appear here
          </div>
        </nav>

        {/* Bottom */}
        <div className="border-t border-[var(--app-border)] py-3 px-3 space-y-0.5 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 text-[12px] text-[var(--app-text-muted)]">
            <Zap className="h-4 w-4 shrink-0 text-[var(--app-text-dim)]" />
            <span>{credits === -1 ? 'Unlimited credits' : `${credits ?? 0} credits remaining`}</span>
          </div>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[13px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors active:scale-[0.98] touch-manipulation"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="px-2 pt-1">
            <WorkspaceAccountMenu />
          </div>

          {/* Safe area bottom */}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      </div>
    </div>
  );

  // ── Desktop icon rail ───────────────────────────────────────────────────
  const desktopRail = (
    <div
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col bg-[var(--app-panel)] border-r border-[var(--app-border)] select-none transition-all duration-200 ease-out"
      style={{ width: sidebarWidth }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Logo area */}
      <div className="h-12 flex items-center shrink-0 border-b border-[var(--app-border)] overflow-hidden px-2">
        <Link
          href="/dashboard/home"
          className="flex items-center rounded-md hover:bg-[var(--app-surface)] transition-colors"
          style={{ padding: effectiveExpanded ? '4px 8px' : '4px' }}
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--app-accent)] flex items-center justify-center shrink-0">
            <span className="text-[12px] font-black text-white leading-none">D</span>
          </div>
          {effectiveExpanded && (
            <div className="ml-2 overflow-hidden">
              <span className="text-[13px] font-semibold text-[var(--app-text)] whitespace-nowrap">DeBuggAI</span>
              <span className="block text-[9px] text-[var(--app-text-dim)] -mt-0.5">v1.0</span>
            </div>
          )}
        </Link>

        {/* Lock toggle */}
        {effectiveExpanded && (
          <button
            onClick={(e) => { e.stopPropagation(); handleLockToggle(); }}
            className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors shrink-0"
            title={locked ? 'Unpin sidebar' : 'Pin sidebar open'}
          >
            {locked ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3 rotate-45" />}
          </button>
        )}
      </div>

      {/* Quick action */}
      <div className={cn(
        'shrink-0 border-b border-[var(--app-border)]',
        effectiveExpanded ? 'px-3 py-2' : 'px-1.5 py-2'
      )}>
        <Link
          href={`/dashboard?create=1`}
          className={cn(
            'flex items-center rounded-lg bg-[var(--app-accent)] text-white hover:opacity-90 transition-opacity active:scale-[0.97]',
            effectiveExpanded
              ? 'gap-2 px-3 py-2 text-[12px] font-medium w-full justify-start'
              : 'w-9 h-9 mx-auto justify-center'
          )}
          title={effectiveExpanded ? undefined : 'New Project (Ctrl+N)'}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {effectiveExpanded && 'New Project'}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 px-1.5 space-y-0.5 overflow-hidden overflow-y-auto">
        {/* Primary nav */}
        {primaryItems.map((item) => (
          <NavLinkDesktop
            key={item.label}
            item={item}
            expanded={effectiveExpanded}
          />
        ))}

        {/* Separator + secondary toggle */}
        <div className="px-1.5 pt-3 pb-1">
          {effectiveExpanded ? (
            <button
              onClick={() => setShowSecondary(!showSecondary)}
              className="flex items-center gap-2 w-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors"
            >
              Tools
              {showSecondary ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </button>
          ) : (
            <div className="h-px bg-[var(--app-border)]" />
          )}
        </div>

        {showSecondary && secondaryItems.map((item) => (
          <NavLinkDesktop
            key={item.label}
            item={item}
            expanded={effectiveExpanded}
          />
        ))}
      </nav>

      {/* Bottom */}
      <div className={cn(
        'border-t border-[var(--app-border)] py-2 space-y-0.5 shrink-0',
        effectiveExpanded ? 'px-1.5' : 'flex flex-col items-center px-1'
      )}>
        {/* Credits */}
        <div className={cn(
          'flex items-center text-[var(--app-text-muted)] rounded-md',
          effectiveExpanded ? 'gap-2.5 px-2.5 py-1.5 text-[11px]' : 'justify-center w-9 h-9 mx-auto'
        )}>
          <Zap className={cn('shrink-0', effectiveExpanded ? 'h-3.5 w-3.5' : 'h-4 w-4', 'text-[var(--app-text-dim)]')} />
          {effectiveExpanded && (
            <span className="truncate">{credits === -1 ? 'Unlimited' : `${credits ?? 0} credits`}</span>
          )}
        </div>

        {/* Theme */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'rounded-md text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors',
            effectiveExpanded ? 'flex items-center gap-2.5 px-2.5 py-1.5 w-full text-[11px]' : 'flex items-center justify-center w-9 h-9 mx-auto'
          )}
          title={effectiveExpanded ? undefined : resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {effectiveExpanded && (resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode')}
        </button>

        {/* Account */}
        <div className={effectiveExpanded ? 'px-2.5 py-1' : 'flex justify-center'}>
          <WorkspaceAccountMenu />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {hamburger}
      {desktopRail}
      {mobileDrawer}
    </>
  );
}

// ── Desktop Nav Link ──────────────────────────────────────────────────────
function NavLinkDesktop({
  item,
  expanded,
}: {
  item: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; active: boolean; shortcut?: string };
  expanded: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={expanded ? undefined : `${item.label}${item.shortcut ? ` (⌘${item.shortcut})` : ''}`}
      className={cn(
        'flex items-center rounded-md transition-colors whitespace-nowrap group relative',
        expanded ? 'gap-2.5 px-2.5 py-1.5' : 'justify-center w-9 h-9 mx-auto',
        item.active
          ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
          : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {expanded && (
        <>
          <span className="text-[12px] font-medium truncate">{item.label}</span>
          {item.shortcut && (
            <kbd className="ml-auto hidden group-hover:inline-flex items-center h-4 px-1 rounded-[3px] bg-[var(--app-panel-2)] border border-[var(--app-border)] text-[9px] font-mono text-[var(--app-text-dim)]">
              ⌘{item.shortcut}
            </kbd>
          )}
        </>
      )}
      {/* Active indicator dot (collapsed) */}
      {item.active && !expanded && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-[var(--app-accent)]" />
      )}
    </Link>
  );
}

// ── Mobile Nav Link ──────────────────────────────────────────────────────
function NavLinkMobile({
  item,
  onClick,
}: {
  item: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; active: boolean };
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-lg text-[13px] font-medium transition-colors active:scale-[0.98] touch-manipulation',
        item.active
          ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
          : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {item.label}
      {item.active && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]" />
      )}
    </Link>
  );
}
