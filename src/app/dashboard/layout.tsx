/**
 * Private Layout - For dashboard pages
 * Provides navigation sidebar for client dashboard
 */

import { SessionBootstrapper } from '@/components/auth/session-bootstrapper';
import { ClientDashboardShell } from '@/components/dashboard/client-dashboard-shell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientDashboardShell>
      <SessionBootstrapper />
      <main>{children}</main>
    </ClientDashboardShell>
  );
}
