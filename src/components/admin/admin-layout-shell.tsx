'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BugIcon,
  LayoutDashboardIcon,
  UsersIcon,
  CoinsIcon,
  FileTextIcon,
  ShieldAlertIcon,
  UserPlusIcon,
  SettingsIcon,
  LogOutIcon,
  BellIcon,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

const STORAGE_KEY = 'debuggai.admin.sidebar.collapsed';

const navItems = [
  { id: 'overview', label: 'Overview', href: '/admin', icon: LayoutDashboardIcon },
  { id: 'users', label: 'Users', href: '/admin/users', icon: UsersIcon },
  { id: 'credits', label: 'Credits', href: '/admin/credits', icon: CoinsIcon },
  { id: 'audit', label: 'Audit', href: '/admin/audit', icon: FileTextIcon },
  { id: 'abuse', label: 'Abuse', href: '/admin/abuse', icon: ShieldAlertIcon },
  { id: 'referrals', label: 'Referrals', href: '/admin/referrals', icon: UserPlusIcon },
  { id: 'settings', label: 'Settings', href: '/admin/settings', icon: SettingsIcon },
];

interface AdminLayoutShellProps {
  children: React.ReactNode;
  userEmail: string;
  userFullName: string;
  signOutAction: () => Promise<void>;
}

export function AdminLayoutShell({
  children,
  userEmail,
  userFullName,
  signOutAction,
}: AdminLayoutShellProps) {
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

  // Close mobile drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const sidebar = (
    <div className="flex flex-col h-full min-h-0">
      {/* Logo */}
      <div className={`flex items-center border-b border-[#1F2B1F] ${collapsed ? 'justify-center h-14' : 'h-[52px] px-5 gap-3'}`}>
        {collapsed ? (
          <button
            onClick={toggleCollapsed}
            className="w-9 h-9 rounded-md bg-[#171C17] border border-[#1F2B1F] flex items-center justify-center text-[#8BAD8B] hover:border-[#00C853] hover:text-[#00C853] transition-colors"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        ) : (
          <>
            <Link href="/admin" className="flex items-center gap-3 shrink-0">
              <div className="w-7 h-7 rounded-md bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center">
                <BugIcon className="w-4 h-4 text-[#00C853]" />
              </div>
              <span className="text-lg font-semibold text-[#E8F5E9]">Admin Console</span>
            </Link>
            <button
              onClick={toggleCollapsed}
              className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-[#8BAD8B] hover:text-[#E8F5E9] hover:bg-[#171C17] transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.id}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center rounded-md text-sm transition-all duration-150 ${
                collapsed
                  ? 'justify-center p-2'
                  : 'gap-3 px-3 py-2'
              } ${
                active
                  ? 'bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/20'
                  : 'text-[#8BAD8B] hover:text-[#E8F5E9] hover:bg-[#171C17] border border-transparent'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-[#1F2B1F]">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3 py-2'}`}>
          {!collapsed && (
            <>
              <button className="w-9 h-9 rounded-md bg-[#171C17] border border-[#1F2B1F] flex items-center justify-center text-[#8BAD8B] hover:border-[#00C853] hover:text-[#00C853] transition-colors">
                <BellIcon className="w-4 h-4" />
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#E8F5E9] truncate">{userFullName || 'Admin'}</p>
                <p className="text-xs text-[#4D6B4D] truncate">{userEmail}</p>
              </div>

              <form action={signOutAction}>
                <button
                  type="submit"
                  className="w-9 h-9 rounded-md bg-[#171C17] border border-[#1F2B1F] flex items-center justify-center text-[#8BAD8B] hover:border-[#FF5252] hover:text-[#FF5252] hover:border-[#FF5252]/30 transition-colors"
                  title="Sign out"
                >
                  <LogOutIcon className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
          {collapsed && (
            <form action={signOutAction}>
              <button
                type="submit"
                className="w-9 h-9 rounded-md bg-[#171C17] border border-[#1F2B1F] flex items-center justify-center text-[#8BAD8B] hover:border-[#FF5252] hover:text-[#FF5252] transition-colors"
                title="Sign out"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0D0A] flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex shrink-0 relative border-r border-[#1F2B1F] bg-[#111411] min-h-screen transition-all duration-300 ease-in-out overflow-hidden ${
          collapsed ? 'w-[60px]' : 'w-64'
        }`}
      >
        {sidebar}

        {/* Rail toggle handle */}
        <button
          onClick={toggleCollapsed}
          className={`absolute right-0 inset-y-0 z-20 flex items-center justify-center transition-all duration-200 w-3 -right-2`}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span
            className={`relative flex h-12 w-5 items-center justify-center rounded-r-md border border-[#1F2B1F] border-l-0 bg-[#111411] transition-all duration-200 opacity-0 hover:opacity-100 hover:shadow-sm ${
              collapsed ? 'opacity-60 border-l rounded-l-md' : ''
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5 text-[#8BAD8B]" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5 text-[#8BAD8B]" />
            )}
          </span>
        </button>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed inset-x-0 top-0 h-12 border-b border-[#1F2B1F] bg-[#0A0D0A]/95 backdrop-blur-sm z-40 flex items-center px-3 gap-2">
        <button
          onClick={() => setMobileOpen(true)}
          className="h-9 w-9 rounded-md flex items-center justify-center text-[#8BAD8B] hover:text-[#E8F5E9] hover:bg-[#171C17] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>

        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center">
            <BugIcon className="w-3.5 h-3.5 text-[#00C853]" />
          </div>
          <span className="text-sm font-semibold text-[#E8F5E9]">Admin</span>
        </Link>
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
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] bg-[#111411] border-r border-[#1F2B1F] transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile drawer header */}
        <div className="h-12 px-4 flex items-center justify-between border-b border-[#1F2B1F]">
          <Link href="/admin" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <div className="w-6 h-6 rounded-md bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center">
              <BugIcon className="w-3.5 h-3.5 text-[#00C853]" />
            </div>
            <span className="text-sm font-semibold text-[#E8F5E9]">Admin Console</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="h-9 w-9 rounded-md flex items-center justify-center text-[#8BAD8B] hover:text-[#E8F5E9] hover:bg-[#171C17] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {sidebar}
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-4 md:p-6 pt-16 md:pt-6">
          {children}
        </div>
      </main>
    </div>
  );
}
