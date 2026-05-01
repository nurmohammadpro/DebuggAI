'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export function SidebarSection({
  label,
  collapsed,
  onToggle,
  children,
  dense = false,
}: {
  label: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  dense?: boolean;
}) {
  return (
    <div className={cn(dense ? '' : 'mt-4')}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/30"
      >
        <span>{label}</span>
        {collapsed ? (
          <ChevronRight className="h-4 w-4 opacity-70" />
        ) : (
          <ChevronDown className="h-4 w-4 opacity-70" />
        )}
      </button>
      {!collapsed && <div className="mt-1">{children}</div>}
    </div>
  );
}

