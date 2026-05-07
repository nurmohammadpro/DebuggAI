'use client';

import { ChevronDown, X, Menu } from 'lucide-react';

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
      <DialogTrigger className="h-9 w-9 rounded-[8px] flex items-center justify-center hover:bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors">
        <span className="sr-only">Open menu</span>
        <Menu className="h-4 w-4" />
      </DialogTrigger>

      <DialogContent
        showCloseButton={false}
        className="p-0 max-w-[320px] w-[92vw] sm:w-[320px] left-0 top-0 translate-x-0 translate-y-0 h-screen max-h-screen rounded-none border-r border-[var(--app-border)] bg-[var(--app-bg)] animate-in slide-in-from-left-full duration-300"
      >
        <div className="h-14 px-4 flex items-center justify-between border-b border-[var(--app-border)] transition-all duration-300">
          <div className="flex items-center gap-2">
            <Logo className="h-5 w-auto" />
            <button className="inline-flex items-center gap-2 px-2 py-1 rounded-[8px] hover:bg-[var(--app-surface)] text-[13px] font-medium transition-colors text-[var(--app-text)]">
              Personal <ChevronDown className="h-4 w-4 text-[var(--app-text-dim)]" />
            </button>
          </div>
          <button
            className="h-9 w-9 rounded-[8px] flex items-center justify-center hover:bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
            onClick={() => onOpenChange(false)}
            type="button"
            aria-label="Close menu"
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
