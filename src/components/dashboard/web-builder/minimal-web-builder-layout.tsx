'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings, HelpCircle } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';

interface MinimalWebBuilderLayoutProps {
  children: ReactNode;
}

export function MinimalWebBuilderLayout({ children }: MinimalWebBuilderLayoutProps) {
  const pathname = usePathname();
  const { user } = useSessionStore();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* Sidebar */}
      <aside className="w-[280px] border-r border-[var(--border-default)] bg-[var(--bg-secondary)] flex flex-col shrink-0">
        {/* Header */}
        <div className="h-14 border-b border-[var(--border-default)] flex items-center px-4">
          <Link href="/dashboard" className="font-semibold text-[14px] text-[var(--text-primary)]">
            DeBuggAI
          </Link>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3">
          <div className="px-4 mb-2 text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
            Workspace
          </div>

          <NavItem
            active={pathname === '/dashboard'}
            icon="⌂"
            label="Dashboard"
            href="/dashboard"
          />
          <NavItem
            active={pathname === '/dashboard/web-builder'}
            icon="⚡"
            label="Web Builder"
            href="/dashboard/web-builder"
          />
          <NavItem
            active={pathname === '/dashboard/debug'}
            icon="🐛"
            label="Debug Session"
            href="/dashboard/debug"
          />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[var(--border-default)]">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-2.5 p-2 rounded-[var(--radius-md)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <div className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[12px] font-medium shrink-0">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[var(--text-primary)] truncate">
                {user?.displayName || user?.email || 'User'}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] capitalize">
                {user?.plan || 'Free'} Plan
              </div>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-[var(--border-default)] flex items-center justify-end px-4 bg-[var(--bg-secondary)]">
          <Link
            href="/docs"
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
            aria-label="Help"
          >
            <HelpCircle className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/settings"
            className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/settings"
            className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface3)] transition-all"
          >
            {user?.email?.[0].toUpperCase() || 'U'}
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {children}
        </div>
      </main>
    </div>
  );
}

interface NavItemProps {
  active: boolean;
  icon: string;
  label: string;
  href: string;
}

function NavItem({ active, icon, label, href }: NavItemProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 px-4 py-1.5 text-[13px] rounded-[var(--radius-sm)] transition-all ${
        active
          ? 'bg-[var(--bg-tertiary)] font-medium text-[var(--text-primary)]'
          : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
      }`}
    >
      <span className="w-4 h-4 flex items-center justify-center text-[12px] shrink-0">
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  );
}
