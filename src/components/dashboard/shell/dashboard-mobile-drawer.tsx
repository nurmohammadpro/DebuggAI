'use client';

import { ChevronDown, X } from 'lucide-react';

import { Logo } from '@/components/logo';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { DashboardSidebarContent } from '@/components/dashboard/shell/dashboard-sidebar-content';
import type { DebugSessionRow } from '@/hooks/queries/use-my-debug-sessions';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';

export function DashboardMobileDrawer({
  open,
  onOpenChange,
  onNewChatClick,
  activeHref = '/dashboard',
  recentChats = [],
  recentProjects = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNewChatClick: () => void;
  activeHref?: string;
  recentChats?: DebugSessionRow[];
  recentProjects?: GenerationRow[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger className="btn btn-ghost h-9 w-9 px-0">
        <span className="sr-only">Open menu</span>
        <div className="h-4 w-4 flex flex-col justify-between">
          <span className="block h-0.5 bg-foreground/70" />
          <span className="block h-0.5 bg-foreground/70" />
          <span className="block h-0.5 bg-foreground/70" />
        </div>
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="p-0 max-w-[320px] w-[92vw] sm:w-[320px] left-0 top-0 translate-x-0 translate-y-0 h-screen max-h-screen rounded-none border-r border-border/40"
      >
        <div className="h-12 px-4 flex items-center justify-between border-b border-border/40">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-auto" />
            <button className="inline-flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted/40 text-sm font-medium">
              Personal <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <button
            className="btn btn-ghost h-9 w-9 px-0"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <DashboardSidebarContent
          activeHref={activeHref}
          recentChats={recentChats}
          recentProjects={recentProjects}
          onNewChatClick={onNewChatClick}
          onNavigate={() => onOpenChange(false)}
          collapsed={false}
        />
      </DialogContent>
    </Dialog>
  );
}
