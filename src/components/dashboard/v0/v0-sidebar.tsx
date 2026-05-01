'use client';

import type { DebugSessionRow } from '@/hooks/queries/use-my-debug-sessions';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';
import { V0SidebarContent } from '@/components/dashboard/v0/v0-sidebar-content';

export function V0Sidebar({
  activeHref,
  recentChats,
  recentProjects,
  onNewChatClick,
}: {
  activeHref: string;
  recentChats: DebugSessionRow[];
  recentProjects: GenerationRow[];
  onNewChatClick: () => void;
}) {
  return (
    <aside className="hidden md:flex w-[280px] shrink-0 border-r border-border/40 bg-card min-h-screen">
      <V0SidebarContent
        activeHref={activeHref}
        recentChats={recentChats}
        recentProjects={recentProjects}
        onNewChatClick={onNewChatClick}
      />
    </aside>
  );
}
