'use client';

import Link from 'next/link';
import { useState } from 'react';
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
          'flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200',
          collapsed ? 'p-2 justify-center' : 'px-3 py-2.5',
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
        )}
      >
        <Icon
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-150',
            active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
            !collapsed && 'group-hover:scale-110',
          )}
        />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>

      {/* Tooltip on hover when collapsed */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
          {label}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-foreground" />
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
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="More"
          title="More"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onTogglePinned} className="cursor-pointer">
          {pinned ? <PinOff className="mr-2 h-4 w-4" /> : <Pin className="mr-2 h-4 w-4" />}
          {pinned ? 'Unpin' : 'Pin'}
        </DropdownMenuItem>
        {onOpenInNewTab && (
          <DropdownMenuItem onClick={onOpenInNewTab} className="cursor-pointer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Open in new tab
          </DropdownMenuItem>
        )}
        {onRename && (
          <DropdownMenuItem onClick={onRename} className="cursor-pointer">
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
        )}
        {onDelete && (
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
