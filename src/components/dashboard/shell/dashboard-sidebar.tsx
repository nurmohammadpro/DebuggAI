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
      className={`hidden md:flex shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-sm min-h-screen transition-all duration-300 ease-in-out overflow-hidden ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col w-64 min-w-64 min-h-0">
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
