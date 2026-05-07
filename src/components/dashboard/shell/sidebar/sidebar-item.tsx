'use client';

import Link from 'next/link';
import { MoreHorizontal, Pin, PinOff, ExternalLink, Pencil, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SidebarItem({
  href,
  label,
  icon,
  active,
  collapsed,
  onNavigate,
  menu,
}: {
  href: string;
  label: string;
  icon: React.ElementType<any>;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
  menu?: React.ReactNode;
}) {
  const Icon = icon;

  return (
    <div className={cn('group relative', collapsed && 'flex justify-center')}>
      <Link
        href={href}
        onClick={onNavigate}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-3 text-[13px] font-normal transition-colors rounded-[8px]',
          collapsed ? 'p-2 justify-center' : 'px-3 py-2.5',
          active
            ? 'bg-[var(--app-surface-subtle)] text-[var(--app-text)]'
            : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[color-mix(in_srgb,var(--app-surface-subtle)_72%,transparent)]',
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-150',
            active ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-dim)] group-hover:text-[var(--app-text)]',
            !collapsed && 'group-hover:scale-110',
          )}
        />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>

      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] px-2.5 py-1.5 text-xs text-[var(--app-text)] opacity-0 transition-opacity group-hover:opacity-100 shadow-[var(--shadow-lg)]">
          {label}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-[var(--app-border)]" />
        </div>
      )}

      {!collapsed && menu && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          {menu}
        </div>
      )}
    </div>
  );
}

export function SidebarItemMenu({
  pinned,
  onTogglePinned,
  onOpenInNewTab,
  onRename,
  onDelete,
}: {
  pinned: boolean;
  onTogglePinned: () => void;
  onOpenInNewTab?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="h-7 w-7 inline-flex items-center justify-center rounded-[6px] text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          aria-label="More"
          title="More"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel-2)]">
        <DropdownMenuItem onClick={onTogglePinned} className="cursor-pointer text-[13px]">
          {pinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
          {pinned ? 'Unpin' : 'Pin'}
        </DropdownMenuItem>
        {onOpenInNewTab && (
          <DropdownMenuItem onClick={onOpenInNewTab} className="cursor-pointer text-[13px]">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </DropdownMenuItem>
        )}
        {onRename && (
          <DropdownMenuItem onClick={onRename} className="cursor-pointer text-[13px]">
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-[13px] text-[var(--app-danger)]">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
