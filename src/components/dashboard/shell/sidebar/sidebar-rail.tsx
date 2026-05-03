'use client';

import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { cn } from '@/lib/utils';

export function SidebarRail({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className={cn(
        'absolute right-0 inset-y-0 z-20 flex items-center justify-center transition-all duration-200',
        collapsed ? 'w-3 -right-2' : 'w-3 -right-2',
      )}
    >
      {/* invisible hit area */}
      <span className="absolute inset-0" />

      {/* visible handle */}
      <span
        className={cn(
          'relative flex h-12 w-5 items-center justify-center rounded-r-md border border-border/40 border-l-0 bg-card transition-all duration-200',
          hovered
            ? 'opacity-100 shadow-sm'
            : collapsed
              ? 'opacity-60'
              : 'opacity-0',
          collapsed && 'border-l rounded-l-md rounded-r-md',
        )}
      >
        {collapsed ? (
          <PanelLeftOpen
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-all duration-200',
              hovered && 'text-foreground scale-110',
            )}
          />
        ) : (
          <PanelLeftClose
            className={cn(
              'h-3.5 w-3.5 text-muted-foreground transition-all duration-200',
              hovered && 'text-foreground scale-110',
            )}
          />
        )}
      </span>
    </button>
  );
}
