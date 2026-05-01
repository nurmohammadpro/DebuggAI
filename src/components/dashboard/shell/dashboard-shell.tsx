'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/logo';
import { DashboardSidebar } from '@/components/dashboard/shell/dashboard-sidebar';
import { DashboardMobileDrawer } from '@/components/dashboard/shell/dashboard-mobile-drawer';
import { DashboardTopRight } from '@/components/dashboard/shell/dashboard-top-right';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: projects = [] } = useMyProjects(25, true);
  const { data: chats = [] } = useMyDebugSessions(25, true);

  const [openMobileNav, setOpenMobileNav] = useState(false);

  const recentProjects = useMemo(() => projects.slice(0, 8), [projects]);
  const recentChats = useMemo(() => chats.slice(0, 10), [chats]);

  const onNewChatClick = () => {
    const el = document.querySelector<HTMLTextAreaElement>('textarea[data-dashboard-composer]');
    el?.focus();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <DashboardSidebar
        activeHref={pathname}
        recentChats={recentChats}
        recentProjects={recentProjects}
        onNewChatClick={onNewChatClick}
      />

      <div className="md:hidden fixed inset-x-0 top-0 h-12 border-b border-border/40 bg-background z-40 flex items-center px-3 gap-2">
        <DashboardMobileDrawer
          open={openMobileNav}
          onOpenChange={setOpenMobileNav}
          onNewChatClick={onNewChatClick}
          activeHref={pathname}
          recentChats={recentChats}
          recentProjects={recentProjects}
        />

        <div className="flex items-center gap-2">
          <Logo className="h-5 w-auto" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <DashboardTopRight />
        </div>
      </div>

      <main className="flex-1 min-w-0">
        <div className="hidden md:flex h-12 items-center justify-end px-5">
          <DashboardTopRight />
        </div>
        <div className="pt-12 md:pt-0 min-h-[calc(100vh-3rem)]">{children}</div>
      </main>
    </div>
  );
}
