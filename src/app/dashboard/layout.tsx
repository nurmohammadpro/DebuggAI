/**
 * Private Layout - For dashboard pages
 * Provides navigation sidebar for client dashboard
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
    <ClientDashboardShell>
      <SessionBootstrapper />
      <DashboardErrorBoundary>
        <main>{children}</main>
      </DashboardErrorBoundary>
    </ClientDashboardShell>
  );
}
