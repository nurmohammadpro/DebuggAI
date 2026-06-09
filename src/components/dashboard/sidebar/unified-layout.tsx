'use client';

import { ReactNode, Suspense, useState } from 'react';
import { Menu } from 'lucide-react';
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar';
import { UnifiedHeader } from '@/components/dashboard/sidebar/unified-header';
import { useShellStore } from '@/store/shell-store';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';
import { CommandPalette } from '@/components/dashboard/command-palette';

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
  const { recentThreads, recentProjects, openCommandPalette, setOpenCommandPalette } = useDashboardShell();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />

      {/* Sidebar — inline flex with collapsible icon rail */}
      {showSidebar && (
        <Suspense fallback={null}>
          <WorkspaceSidebar
            isOpen={true}
            variant="inline"
            collapsed={sidebarCollapsed}
            onToggleCollapsed={toggleSidebar}
            recentProjects={recentProjects}
            recentThreads={recentThreads}
            onClose={() => {}}
            mobileOpen={mobileMenuOpen}
            onMobileClose={() => setMobileMenuOpen(false)}
          />
        </Suspense>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <UnifiedHeader
          title={title}
          subtitle={subtitle}
          actions={headerActions}
          mobileMenuButton={
            showSidebar ? (
              <button
                className="md:hidden touch-target flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] active:scale-[0.96] transition-all"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            ) : null
          }
        />

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
