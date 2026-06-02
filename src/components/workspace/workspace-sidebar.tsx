'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { cn } from '@/lib/utils';

/**
 * Clean workspace sidebar using design tokens (CSS variables).
 * Desktop: absolute-positioned, hover-expands. Mobile: drawer overlay.
 */
export function WorkspaceSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSessionStore();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const activeProjectId = searchParams?.get('project');

  const isWorkspace = pathname === '/dashboard' && !!activeProjectId;
  const isDashboardHome = pathname === '/dashboard' && !activeProjectId;
  const isDebug = pathname === '/dashboard/debug' || pathname.startsWith('/dashboard/debug/');
  const isRuns = pathname === '/dashboard/runs' || pathname.startsWith('/dashboard/runs/');
  const isBranches = pathname === '/dashboard/branches';

  const navItems = [
    { href: '/dashboard/home', icon: Home, label: 'Home', active: isDashboardHome },
    { href: `/dashboard?project=${activeProjectId || ''}`, icon: Pencil, label: 'Builder', active: isWorkspace },
    { href: '/dashboard/debug', icon: Bug, label: 'Debug', active: isDebug },
    { href: '/dashboard/runs', icon: ListChecks, label: 'Runs', active: isRuns },
    { href: '/dashboard/branches', icon: GitBranch, label: 'Branches', active: isBranches },
  ];

  const credits = user?.credits;

  // ── Mobile hamburger ──
  const hamburger = (
    <button
      className="md:hidden fixed top-2 left-2 z-50 w-8 h-8 rounded-[8px] flex items-center justify-center bg-[var(--app-panel)] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors shadow-lg"
      onClick={() => setMobileOpen(true)}
      aria-label="Open menu"
    >
      <PanelLeft className="w-4 h-4" />
    </button>
  );

  // ── Mobile drawer ──
  const mobileDrawer = mobileOpen && (
    <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--app-panel)] border-r border-[var(--app-border)] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-[var(--app-border)] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--app-accent)] flex items-center justify-center">
              <span className="text-[10px] font-black text-white leading-none">D</span>
            </div>
            <span className="text-[12px] font-semibold text-[var(--app-text)]">DeBuggAI</span>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-7 h-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[13px] font-medium transition-colors',
                  item.active
                    ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-[var(--app-border)] py-2 px-2 space-y-0.5">
          <div className="flex items-center gap-3 px-3 py-2 text-[12px] text-[var(--app-text-muted)]">
            <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--app-text-dim)]" />
            {credits === -1 ? 'Unlimited credits' : `${credits ?? 0} credits`}
          </div>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[13px] font-medium text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
          <div className="px-3 py-2">
            <WorkspaceAccountMenu />
          </div>
        </div>
      </div>
    </div>
  );

  // ── Desktop icon rail (absolute, no flex overlap) ──
  const desktopRail = (
    <div
      className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col bg-[var(--app-panel)] border-r border-[var(--app-border)] select-none transition-all duration-200 ease-out"
      style={{ width: expanded ? 200 : 48 }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo */}
      <div className="h-12 flex items-center justify-center shrink-0 border-b border-[var(--app-border)] overflow-hidden">
        <Link href="/dashboard/home" className="flex items-center justify-center w-9 h-9 shrink-0" title="DeBuggAI Home">
          <div className="w-7 h-7 rounded-md bg-[var(--app-accent)] flex items-center justify-center shrink-0">
            <span className="text-[11px] font-black text-white leading-none">D</span>
          </div>
        </Link>
        {expanded && <span className="ml-2 text-[13px] font-semibold text-[var(--app-text)] whitespace-nowrap">DeBuggAI</span>}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-hidden overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={cn(
                'flex items-center rounded-[7px] transition-colors whitespace-nowrap',
                expanded ? 'gap-3 px-3 py-2' : 'justify-center w-9 h-9 mx-auto',
                item.active
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)]'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {expanded && <span className="text-[13px] font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className={cn(
        'border-t border-[var(--app-border)] py-2 space-y-0.5',
        expanded ? 'px-2' : 'flex flex-col items-center px-1'
      )}>
        {/* Credits */}
        <div className={cn(
          'flex items-center text-[var(--app-text-muted)] rounded-[7px] transition-colors',
          expanded ? 'gap-3 px-3 py-2 text-[12px]' : 'justify-center w-9 h-9 mx-auto'
        )}>
          <Zap className="h-3.5 w-3.5 shrink-0 text-[var(--app-text-dim)]" />
          {expanded && <span>{credits === -1 ? 'Unlimited' : `${credits ?? 0} credits`}</span>}
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className={cn(
            'rounded-[7px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-subtle)] transition-colors',
            expanded ? 'flex items-center gap-3 px-3 py-2 w-full text-[13px]' : 'flex items-center justify-center w-9 h-9 mx-auto'
          )}
          title="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {expanded && <span>{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>}
        </button>

        {/* Account */}
        <div className={cn(expanded ? 'px-3 py-2' : 'flex justify-center')}>
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
