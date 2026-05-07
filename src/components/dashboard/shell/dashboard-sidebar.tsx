'use client';

import type { DebugSessionRow } from '@/hooks/queries/use-my-debug-sessions';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';
import { DashboardSidebarContent } from '@/components/dashboard/shell/dashboard-sidebar-content';
import { SidebarHeader } from '@/components/dashboard/shell/sidebar/sidebar-header';
import { SidebarRail } from '@/components/dashboard/shell/sidebar/sidebar-rail';

export function DashboardSidebar({
  activeHref,
  recentChats,
  recentProjects,
  onNewChatClick,
  collapsed,
  onToggleCollapsed,
}: {
  activeHref: string;
  recentChats: DebugSessionRow[];
  recentProjects: GenerationRow[];
  onNewChatClick: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <aside
      className={`hidden md:flex shrink-0 sticky top-0 bg-[var(--app-bg)] h-screen transition-all duration-300 ease-in-out overflow-hidden border-r border-[var(--app-border)] ${
        collapsed ? 'w-[68px]' : 'w-[280px]'
      }`}
    >
      <div className="flex flex-col w-full h-full min-w-0">
        <SidebarHeader collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
        <DashboardSidebarContent
          activeHref={activeHref}
          recentChats={recentChats}
          recentProjects={recentProjects}
          onNewChatClick={onNewChatClick}
          collapsed={collapsed}
        />
      </div>
      <SidebarRail collapsed={collapsed} onToggle={onToggleCollapsed} />
    </aside>
  );
}
