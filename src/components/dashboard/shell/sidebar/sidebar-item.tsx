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
    <div className={cn('group relative', collapsed ? 'px-1' : 'px-0')}>
      {active && (
        <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary" />
      )}
      <Link
        href={href}
        onClick={onNavigate}
        title={collapsed ? label : undefined}
        className={cn(
          'flex items-center gap-3 rounded-md text-sm hover:bg-muted/40 transition-colors',
          collapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2',
          active ? 'text-foreground bg-muted/30' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} />
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>

      {!collapsed && menu && (
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
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
          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted/50 text-muted-foreground"
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
