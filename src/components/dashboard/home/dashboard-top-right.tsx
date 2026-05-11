'use client';

import Link from 'next/link';
import { useSessionStore } from '@/store/session-store';
import { Settings, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DashboardTopRight() {
  const { user } = useSessionStore();

  return (
    <div className="flex items-center gap-2">
      {/* Help */}
      <Link
        href="/docs"
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)]',
          'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          'hover:bg-[var(--bg-tertiary)] transition-all'
        )}
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </Link>

      {/* Settings */}
      <Link
        href="/dashboard/settings"
        className={cn(
          'w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)]',
          'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
          'hover:bg-[var(--bg-tertiary)] transition-all'
        )}
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
  );
}
