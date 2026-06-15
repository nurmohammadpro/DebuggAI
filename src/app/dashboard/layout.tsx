/**
 * Dashboard Layout — Supabase SSR middleware handles auth redirect.
 */

import { SessionBootstrapper } from '@/components/auth/session-bootstrapper';
import { ClientDashboardShell } from '@/components/dashboard/client-dashboard-shell';
import { DashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SessionBootstrapper />
      <ClientDashboardShell>
        <DashboardErrorBoundary>
          {children}
        </DashboardErrorBoundary>
      </ClientDashboardShell>
    </>
  );
}
