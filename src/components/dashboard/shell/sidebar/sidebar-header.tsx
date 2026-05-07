'use client';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { Logo } from '@/components/logo';
import { cn } from '@/lib/utils';

export function SidebarHeader({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <div
      className={cn(
        'h-14 flex items-center transition-colors duration-150',
        collapsed ? 'justify-center' : 'px-3 justify-between',
      )}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <Logo className="h-5 w-auto shrink-0" />
            <span className="text-[13px] font-semibold text-[var(--app-text)]">DeBuggAI</span>
          </div>

          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-[var(--app-text-dim)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </>
      )}
    </div>
  );
}
