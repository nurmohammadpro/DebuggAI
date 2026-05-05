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
    <div className="h-screen w-full flex bg-background overflow-hidden relative">

      {isFetching > 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[100] bg-gradient-to-r from-primary via-primary to-primary/50 animate-pulse" />
      )}

      {/* Sidebar - Remains fixed height */}
      <DashboardSidebar
        activeHref={pathname}
        recentChats={recentChats}
        recentProjects={recentProjects}
        onNewChatClick={onNewChatClick}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />

      {/* Content Area Column */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        {/* Mobile Header */}
        <div className="md:hidden h-12 border-b border-border/40 bg-background flex items-center px-3 gap-2 shrink-0">
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
        <div className="hidden md:flex h-14 items-center justify-end px-5 border-b border-border/40 bg-background shrink-0 transition-all duration-300">
          <DashboardTopRight />
        </div>

        {/* Breadcrumbs - Only if not at root dashboard? But user says they are okay elsewhere */}
        <div className="shrink-0">
          <DashboardBreadcrumbs />
        </div>

        {/* Main Viewport */}
        <main id="dashboard-main-content" className="flex-1 min-h-0 overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>

      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />
    </div>
  );
}
