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
    <div className="h-screen w-full flex bg-[var(--app-bg)] overflow-hidden relative">

      <DashboardSidebar
        activeHref={pathname}
        recentChats={recentChats}
        recentProjects={recentProjects}
        onNewChatClick={onNewChatClick}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        {/* Mobile Header */}
        <div className="md:hidden h-14 bg-[var(--app-bg)] flex items-center px-3 gap-2 shrink-0 border-b border-[var(--app-border)]">
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

        {/* Desktop Header */}
        <div className="hidden md:flex h-14 items-center justify-end px-6 bg-[var(--app-bg)] shrink-0 border-b border-[var(--app-border)]">
          <DashboardTopRight />
        </div>

        <div className="shrink-0">
          <DashboardBreadcrumbs />
        </div>

        <main id="dashboard-main-content" className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>

      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />
    </div>
  );
}
