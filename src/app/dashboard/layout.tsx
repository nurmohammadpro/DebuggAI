/**
 * Dashboard Layout — Clerk middleware handles auth redirect.
 */

import { ClerkSessionSync } from '@/components/auth/clerk-session-sync';
import { ClientDashboardShell } from '@/components/dashboard/client-dashboard-shell';
import { DashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClerkSessionSync />
      <ClientDashboardShell>
        <DashboardErrorBoundary>
          {children}
        </DashboardErrorBoundary>
      </ClientDashboardShell>
    </>
  );
}
