/**
 * Client Dashboard Shell
 *
 * Shared shell for client dashboard pages.
 * Note: `/dashboard` renders the IDE (when `?project=...`) or the v0-inspired home screen
 * internally, so we avoid wrapping it to prevent double shells.
 */

'use client';

import { usePathname } from 'next/navigation';
import { V0DashboardShell } from '@/components/dashboard/v0/v0-dashboard-shell';

interface ClientDashboardShellProps {
  children: React.ReactNode;
}

export function ClientDashboardShell({ children }: ClientDashboardShellProps) {
  const pathname = usePathname();

  if (pathname === '/dashboard') return <>{children}</>;
  return <V0DashboardShell>{children}</V0DashboardShell>;
}

