'use client';

import { ReactNode, Suspense } from 'react';
import { AppSidebar } from '@/components/dashboard/sidebar/app-sidebar';
import { UnifiedHeader } from '@/components/dashboard/sidebar/unified-header';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';
import { CommandPalette } from '@/components/dashboard/command-palette';

interface UnifiedLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export function UnifiedLayout({
  children,
  title,
  subtitle,
  headerActions,
}: UnifiedLayoutProps) {
  const { openCommandPalette, setOpenCommandPalette } = useDashboardShell();

  return (
    <SidebarProvider defaultOpen>
      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />

      <Suspense fallback={null}>
        <AppSidebar />
      </Suspense>

      <SidebarInset className="!min-w-0">
        <UnifiedHeader
          title={title}
          subtitle={subtitle}
          actions={headerActions}
          mobileMenuButton={<SidebarTrigger className="md:hidden touch-target" />}
          showHelp
          showAccountMenu
        />

        <div className="flex-1 min-h-0 overflow-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
