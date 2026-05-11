'use client';

import { ReactNode } from 'react';
import { UnifiedSidebar } from '@/components/dashboard/sidebar/unified-sidebar';
import { UnifiedHeader } from '@/components/dashboard/sidebar/unified-header';
import { useShellStore } from '@/store/shell-store';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';

interface UnifiedLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  showSidebar?: boolean;
}

export function UnifiedLayout({
  children,
  title,
  subtitle,
  headerActions,
  showSidebar = true,
}: UnifiedLayoutProps) {
  const { sidebarCollapsed, toggleSidebar } = useShellStore();
  const { recentChats, recentProjects } = useDashboardShell();

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* Sidebar */}
      {showSidebar && (
        <UnifiedSidebar
          recentChats={recentChats}
          recentProjects={recentProjects}
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <UnifiedHeader title={title} subtitle={subtitle} actions={headerActions} />

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
