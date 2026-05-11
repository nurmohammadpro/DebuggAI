'use client';

import Link from 'next/link';
import { Settings, HelpCircle } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';

interface UnifiedHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function UnifiedHeader({ title, subtitle, actions }: UnifiedHeaderProps) {
  const { user } = useSessionStore();

  return (
    <header className="h-14 border-b border-[var(--border-default)] flex items-center justify-between px-4 bg-[var(--bg-secondary)] shrink-0">
      {/* Left: Title */}
      <div className="flex items-center gap-3 min-w-0">
        {title && (
          <div className="min-w-0">
            <h1 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[12px] text-[var(--text-secondary)] truncate">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {actions}

        {/* Help */}
        <Link
          href="/docs"
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
          aria-label="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </Link>

        {/* Settings */}
        <Link
          href="/dashboard/settings"
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>

        {/* User Avatar */}
        <Link
          href="/dashboard/settings"
          className="w-7 h-7 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[12px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-surface3)] transition-all"
        >
          {user?.email?.[0].toUpperCase() || 'U'}
        </Link>
      </div>
    </header>
  );
}
