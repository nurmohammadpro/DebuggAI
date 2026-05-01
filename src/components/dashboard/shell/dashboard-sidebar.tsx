'use client';

import type { DebugSessionRow } from '@/hooks/queries/use-my-debug-sessions';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';
import { DashboardSidebarContent } from '@/components/dashboard/shell/dashboard-sidebar-content';
import { SidebarHeader } from '@/components/dashboard/shell/sidebar/sidebar-header';

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
      className={
        collapsed
          ? 'hidden md:flex w-[72px] shrink-0 border-r border-border/40 bg-card min-h-screen'
          : 'hidden md:flex w-[280px] shrink-0 border-r border-border/40 bg-card min-h-screen'
      }
    >
      <div className="flex flex-col w-full min-h-0">
        <SidebarHeader collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
        <DashboardSidebarContent
          activeHref={activeHref}
          recentChats={recentChats}
          recentProjects={recentProjects}
          onNewChatClick={onNewChatClick}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}
