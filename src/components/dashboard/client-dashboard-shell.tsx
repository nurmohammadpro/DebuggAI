/**
 * Client Dashboard Shell
 *
 * Shared shell for client dashboard pages.
 * Note:
 * - `/dashboard` renders its own layout (UnifiedLayout or IDE)
 * - `/dashboard/web-builder` uses UnifiedLayout with its own sidebar
 * - `/dashboard/debug` uses UnifiedLayout with its own sidebar
 * So we avoid wrapping these to prevent double sidebars.
 */

'use client';

import { usePathname } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/shell/dashboard-shell';

interface ClientDashboardShellProps {
  children: React.ReactNode;
}

export function ClientDashboardShell({ children }: ClientDashboardShellProps) {
  const pathname = usePathname();

  // These routes handle their own layout with UnifiedLayout or WorkspaceDashboard
  if (pathname === '/dashboard' ||
      pathname === '/dashboard/web-builder' ||
      pathname.startsWith('/dashboard/debug')) {
    return <>{children}</>;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
