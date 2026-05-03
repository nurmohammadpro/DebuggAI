'use client';

import { PanelLeftClose, PanelLeftOpen, ChevronDown } from 'lucide-react';

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
        'h-12 flex items-center gap-2 border-b border-border/40',
        collapsed ? 'px-2' : 'px-4'
      )}
    >
      <Logo className="h-5 w-auto shrink-0" />
      {!collapsed && (
        <button
          className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/40 text-sm font-medium min-w-0"
          type="button"
          title="Workspace"
        >
          <span className="truncate">Personal</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      <button
        type="button"
        onClick={onToggleCollapsed}
        className={cn(
          'btn btn-ghost h-9 w-9 px-0 shrink-0',
          collapsed ? 'ml-0' : 'ml-auto'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </button>
    </div>
  );
}

