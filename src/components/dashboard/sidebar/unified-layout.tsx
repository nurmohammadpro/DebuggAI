'use client';

import { ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import { UnifiedSidebar } from '@/components/dashboard/sidebar/unified-sidebar';
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
    <div className="min-h-[100dvh] w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />
      {/* Sidebar */}
      {showSidebar && (
        <>
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <UnifiedSidebar
              recentThreads={recentThreads}
              recentProjects={recentProjects}
              collapsed={sidebarCollapsed}
              onToggleCollapsed={toggleSidebar}
            />
          </div>

          {/* Mobile Sidebar Overlay */}
          {mobileMenuOpen && (
            <>
              <div
                className="fixed top-12 bottom-0 left-0 right-0 bg-black/45 z-40 md:hidden"
                onClick={() => setMobileMenuOpen(false)}
              />
              {/* wrapper is header-aware; keep the top bar clickable by not covering it */}
              <div className="fixed inset-0 z-50 md:hidden pointer-events-none">
                <div className="fixed top-12 bottom-0 left-0 right-0 bg-transparent pointer-events-none" />
                <div className="fixed top-12 bottom-2 left-2 w-[min(320px,calc(100vw-16px))] rounded-[10px] bg-[color-mix(in_srgb,var(--bg-secondary)_92%,black)] border border-[var(--border-default)] shadow-[0_18px_55px_rgba(0,0,0,0.35)] overflow-y-auto pointer-events-auto">
                <UnifiedSidebar
                  recentThreads={recentThreads}
                  recentProjects={recentProjects}
                  collapsed={false}
                  onToggleCollapsed={() => setMobileMenuOpen(false)}
                  mobile
                />
                </div>
              </div>
            </>
          )}
        </>
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
                className="md:hidden w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
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
