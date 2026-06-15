/**
 * Dashboard Layout — Supabase SSR middleware handles auth redirect.
 *
 * NOTE: SessionBootstrapper is in the root layout (src/app/layout.tsx) and
 * must NOT be duplicated here. A second instance would create a second
 * useEffect subscription and double the API calls on mount.
 */

import { ClientDashboardShell } from '@/components/dashboard/client-dashboard-shell';
import { DashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ClientDashboardShell>
        <DashboardErrorBoundary>
          {children}
        </DashboardErrorBoundary>
      </ClientDashboardShell>
    </>
  );
}
