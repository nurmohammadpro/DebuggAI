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
        'h-14 flex items-center border-b border-border/30 transition-colors duration-150',
        collapsed ? 'justify-center' : 'px-3 justify-between',
      )}
    >
      {collapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="h-5 w-5" />
        </button>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <Logo className="h-5 w-auto shrink-0" />
            <span className="text-sm font-semibold text-foreground">DeBuggAI</span>
          </div>

          <button
            type="button"
            onClick={onToggleCollapsed}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
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
