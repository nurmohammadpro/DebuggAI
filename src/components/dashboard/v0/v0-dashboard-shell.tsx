'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/logo';
import { V0Sidebar } from '@/components/dashboard/v0/v0-sidebar';
import { V0MobileDrawer } from '@/components/dashboard/v0/v0-mobile-drawer';
import { V0HomeTopRight } from '@/components/dashboard/v0/v0-home-top-right';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';

export function V0DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: projects = [] } = useMyProjects(25, true);
  const { data: chats = [] } = useMyDebugSessions(25, true);

  const [openMobileNav, setOpenMobileNav] = useState(false);

  const recentProjects = useMemo(() => projects.slice(0, 8), [projects]);
  const recentChats = useMemo(() => chats.slice(0, 10), [chats]);

  const onNewChatClick = () => {
    const el = document.querySelector<HTMLTextAreaElement>('textarea[data-v0-composer]');
    el?.focus();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <V0Sidebar
        activeHref={pathname}
        recentChats={recentChats}
        recentProjects={recentProjects}
        onNewChatClick={onNewChatClick}
      />

      <div className="md:hidden fixed inset-x-0 top-0 h-12 border-b border-border/40 bg-background z-40 flex items-center px-3 gap-2">
        <V0MobileDrawer
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
          <V0HomeTopRight />
        </div>
      </div>

      <main className="flex-1 min-w-0">
        <div className="hidden md:flex h-12 items-center justify-end px-5">
          <V0HomeTopRight />
        </div>
        <div className="pt-12 md:pt-0 min-h-[calc(100vh-3rem)]">{children}</div>
      </main>
    </div>
  );
}

