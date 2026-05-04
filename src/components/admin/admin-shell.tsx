'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, BarChart3, Users, CreditCard, Activity, Menu, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';

const STORAGE_KEY = 'debuggai.admin-dashboard.sidebar.collapsed';

const navItems = [
  { href: '/dashboard/admin', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users },
  { href: '/dashboard/admin/credits', label: 'Credits', icon: CreditCard },
  { href: '/dashboard/admin/monitoring', label: 'Monitoring', icon: Activity },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const sidebar = (
    <div className="flex flex-col h-full min-h-0">
      <div className={`flex items-center border-b border-border/40 ${collapsed ? 'justify-center h-12' : 'h-12 px-4 gap-2'}`}>
        {collapsed ? (
          <button
            onClick={toggleCollapsed}
            className="h-9 w-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : (
          <>
            <Link href="/dashboard/admin" className="flex items-center gap-2 shrink-0">
              <Logo className="h-5 w-auto" />
            </Link>
            <div className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple/10 border border-purple/20 text-purple">
              <Shield className="h-3.5 w-3.5" />
              Admin
            </div>
            <button
              onClick={toggleCollapsed}
              className="ml-auto h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`rounded-md flex items-center text-sm transition-colors ${
                collapsed
                  ? 'justify-center p-2'
                  : 'h-10 px-3 gap-2'
              } ${
                active
                  ? 'bg-muted/60 text-foreground'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex shrink-0 relative border-r border-border/40 bg-card min-h-screen transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? 'w-[60px]' : 'w-64'
        }`}
      >
        {sidebar}

        {/* Rail toggle handle */}
        <button
          onClick={toggleCollapsed}
          className="absolute right-0 inset-y-0 z-20 flex items-center justify-center w-3 -right-2"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span
            className={`relative flex h-12 w-5 items-center justify-center rounded-r-md border border-border/40 border-l-0 bg-card transition-all duration-200 opacity-0 hover:opacity-100 hover:shadow-sm ${
              collapsed ? 'opacity-60 border-l rounded-l-md' : ''
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        </button>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed inset-x-0 top-0 h-12 border-b border-border/40 bg-background/95 backdrop-blur-sm z-40 flex items-center px-3 gap-2">
        <button
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link href="/dashboard/admin" className="flex items-center gap-2">
          <Logo className="h-4 w-auto" />
          <span className="text-sm font-semibold">Admin</span>
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle className="h-9 w-9" />
          <WorkspaceAccountMenu />
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-card border-r border-border/40 transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-12 px-4 flex items-center justify-between border-b border-border/40">
          <Link href="/dashboard/admin" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <Logo className="h-5 w-auto" />
            <span className="text-sm font-semibold">Admin</span>
            <div className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple/10 border border-purple/20 text-purple">
              <Shield className="h-3 w-3" />
              Admin
            </div>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="h-9 w-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebar}
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="hidden md:flex h-12 px-4 items-center gap-2 border-b border-border/40 bg-card sticky top-0 z-40">
          <div className="text-sm font-semibold">Admin</div>
          <div className="flex-1" />
          <ThemeToggle className="h-9 w-9" />
          <WorkspaceAccountMenu />
        </header>

        <main className="flex-1 min-h-0 overflow-auto">
          <div className="p-4 md:p-6 pt-16 md:pt-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
