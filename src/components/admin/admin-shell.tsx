'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Users, CreditCard, Activity, Menu, X, PanelLeftClose, PanelLeftOpen, LogOutIcon, Play, Bot } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';
import { useSessionStore } from '@/store/session-store';

const STORAGE_KEY = 'debuggai.admin-dashboard.sidebar.collapsed';

const navItems = [
  { href: '/dashboard/admin', label: 'Analytics', icon: BarChart3, description: 'Platform health and usage' },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users, description: 'Accounts, roles, and status' },
  { href: '/dashboard/admin/credits', label: 'Credits', icon: CreditCard, description: 'Transactions and balances' },
  { href: '/dashboard/admin/runs', label: 'Runs', icon: Play, description: 'Agent runs and job inspection' },
  { href: '/dashboard/admin/monitoring', label: 'Monitoring', icon: Activity, description: 'System health and metrics' },
  { href: '/dashboard/admin/ai', label: 'AI Provider', icon: Bot, description: 'LLM API settings and keys' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useSessionStore();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setCollapsed(stored === 'true');
    } catch { /* ignore */ }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleCollapsed]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard/admin' && pathname.startsWith(href));

  const sidebar = (
    <div className="flex flex-col h-full min-h-0">
      {/* Logo */}
      <div className={`flex items-center ${collapsed ? 'justify-center h-14' : 'px-4 py-4 gap-3'}`}>
        {collapsed ? (
          <button
            onClick={toggleCollapsed}
            className="w-9 h-9 rounded-[8px] bg-[var(--app-panel-2)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-text-muted)] hover:border-[var(--app-accent)] hover:text-[var(--app-accent)] transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        ) : (
          <>
            <Link href="/dashboard/admin" className="flex items-center gap-2 shrink-0">
              <span className="flex h-10 w-16 items-center justify-center overflow-hidden rounded-[8px] bg-[var(--app-panel-2)] px-2">
                <BarChart3 className="w-5 h-5 text-[var(--app-accent)]" />
              </span>
            </Link>
            <button
              onClick={toggleCollapsed}
              className="ml-auto h-7 w-7 rounded-[8px] flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-[8px] transition-colors ${
                collapsed
                  ? 'justify-center p-2'
                  : 'gap-3 px-3 py-2.5'
              } ${
                active
                  ? 'bg-[var(--app-surface-subtle)] text-[var(--app-text)]'
                  : 'text-[var(--app-text-muted)] hover:bg-[color-mix(in_srgb,var(--app-surface-subtle)_72%,transparent)] hover:text-[var(--app-text)]'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && (
                <span className="min-w-0">
                  <span className="block text-sm font-normal tracking-[-0.02em]">{item.label}</span>
                  {item.description && (
                    <span className="block truncate text-xs text-[var(--app-text-dim)]">{item.description}</span>
                  )}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="p-3">
        <div className="rounded-[8px] bg-[var(--app-panel-2)]/75 p-3">
          {collapsed ? (
            <button
              className="w-9 h-9 rounded-[8px] bg-[var(--app-panel)] border border-[var(--app-border)] flex items-center justify-center text-[var(--app-text-muted)] hover:border-[var(--app-danger)] hover:text-[var(--app-danger)] transition-colors mx-auto"
              title="Sign out"
            >
              <LogOutIcon className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-[var(--app-surface)] text-xs font-medium text-[var(--app-text-muted)]">
                {user?.email?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-normal text-[var(--app-text)]">
                  {user?.displayName || user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="truncate text-[11px] text-[var(--app-text-dim)]">
                  {user?.email || 'admin'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-[var(--app-overlay)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_92%,var(--app-panel)_8%)] px-4 py-4 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0 w-[288px]' : '-translate-x-full'
        } lg:w-[288px]`}
      >
        {sidebar}
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed inset-x-0 top-0 h-12 border-b border-[var(--app-border)] bg-[var(--app-bg)]/95 backdrop-blur-sm z-20 flex items-center px-3 gap-2">
        <button
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 rounded-[8px] flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <Link href="/dashboard/admin" className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--app-text)]">Admin</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle className="h-9 w-9" />
        </div>
      </div>

      {/* Main Content */}
      <main className="min-h-screen lg:pl-[288px]">
        <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          {/* Desktop header */}
          <header className="sticky top-0 z-20 mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_88%,transparent)] px-1 py-4 backdrop-blur-xl sm:px-2">
            <div className="flex items-start gap-3">
              <div>
                <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
                  Admin
                </h1>
                <p className="mt-1 max-w-[60ch] text-[13px] font-normal text-[var(--app-text-muted)]">
                  Manage users, credits, and platform settings
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <ThemeToggle className="h-9 w-9 rounded-[10px] border border-[var(--app-border-strong)] bg-[var(--app-panel)] text-[var(--app-text-muted)] shadow-none hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]" />
            </div>
          </header>
          <div className="flex-1">{children}</div>
        </div>
      </main>
    </div>
  );
}
