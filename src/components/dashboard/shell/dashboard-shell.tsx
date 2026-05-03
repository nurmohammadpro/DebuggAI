'use client';

import { useIsFetching } from '@tanstack/react-query';
import { Logo } from '@/components/logo';
import { DashboardSidebar } from '@/components/dashboard/shell/dashboard-sidebar';
import { DashboardMobileDrawer } from '@/components/dashboard/shell/dashboard-mobile-drawer';
import { DashboardTopRight } from '@/components/dashboard/shell/dashboard-top-right';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { DashboardBreadcrumbs } from '@/components/dashboard/dashboard-breadcrumbs';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const isFetching = useIsFetching();
  const {
    pathname,
    recentChats,
    recentProjects,
    openMobileNav,
    setOpenMobileNav,
    openCommandPalette,
    setOpenCommandPalette,
    sidebarCollapsed,
    toggleSidebar,
    onNewChatClick,
  } = useDashboardShell();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {isFetching > 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[100] bg-gradient-to-r from-primary via-primary to-primary/50 animate-pulse" />
      )}

      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-card focus:border focus:border-border focus:rounded-md focus:text-foreground"
      >
        Skip to content
      </a>

      <DashboardSidebar
        activeHref={pathname}
        recentChats={recentChats}
        recentProjects={recentProjects}
        onNewChatClick={onNewChatClick}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />

      <div className="md:hidden fixed inset-x-0 top-0 h-12 border-b border-border/40 bg-background/95 backdrop-blur-sm z-40 flex items-center px-3 gap-2 transition-all duration-300">
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

      <main id="dashboard-main-content" className="flex-1 min-w-0">
        <div className="hidden md:flex h-14 items-center justify-end px-5 border-b border-border/40 bg-background/50 backdrop-blur-sm transition-all duration-300">
          <DashboardTopRight />
        </div>
        <DashboardBreadcrumbs />
        <div className="pt-12 md:pt-0 min-h-[calc(100vh-3.5rem)]">{children}</div>
      </main>

      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />
    </div>
  );
}
