/**
 * Client Dashboard Shell
 *
 * Shared shell for client dashboard pages.
 * Note: `/dashboard` renders the IDE (when `?project=...`) or the dashboard home screen
 * internally, so we avoid wrapping it to prevent double shells.
 */

'use client';

import { usePathname } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/shell/dashboard-shell';

interface ClientDashboardShellProps {
  children: React.ReactNode;
}

export function ClientDashboardShell({ children }: ClientDashboardShellProps) {
  const pathname = usePathname();

  if (pathname === '/dashboard') return <>{children}</>;
  return <DashboardShell>{children}</DashboardShell>;
}
