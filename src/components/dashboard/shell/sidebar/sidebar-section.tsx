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
    <div className={cn('transition-all duration-200', dense ? '' : 'mt-4')}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-md hover:bg-muted/40 transition-all duration-200 uppercase tracking-wider"
      >
        <span className="transition-all duration-200">{label}</span>
        <div className="transition-transform duration-300">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 opacity-60" />
          ) : (
            <ChevronDown className="h-4 w-4 opacity-60" />
          )}
        </div>
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          collapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'
        )}
      >
        <div className="mt-1.5 space-y-1">{children}</div>
      </div>
    </div>
  );
}
