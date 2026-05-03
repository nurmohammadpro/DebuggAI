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
        className="w-full flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground px-2 py-1 rounded-md hover:bg-accent/40 transition-colors"
      >
        <span>{label}</span>
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5 opacity-70" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        )}
      </button>
      {!collapsed && <div className="mt-1">{children}</div>}
    </div>
  );
}
