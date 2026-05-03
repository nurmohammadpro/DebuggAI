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
        'h-14 flex items-center gap-2 border-b border-border/40 px-4 transition-all duration-300',
        collapsed ? 'justify-center' : 'justify-between'
      )}
    >
      <div className={cn('flex items-center gap-2 transition-all duration-300', collapsed && 'opacity-0 w-0')}>
        <Logo className="h-5 w-auto shrink-0" />
        {!collapsed && (
          <button
            className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/50 text-sm font-medium min-w-0 transition-colors duration-200"
            type="button"
            title="Workspace"
          >
            <span className="truncate">Personal</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onToggleCollapsed}
        className={cn(
          'h-9 w-9 px-0 shrink-0 rounded-md flex items-center justify-center transition-all duration-200',
          'hover:bg-muted/50 text-muted-foreground hover:text-foreground',
          collapsed ? 'mx-auto' : 'ml-auto'
        )}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <div className="transition-transform duration-300">
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </div>
      </button>
    </div>
  );
}
