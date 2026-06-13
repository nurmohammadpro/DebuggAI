/**
 * Private Layout - For dashboard pages
 * Provides navigation sidebar for client dashboard
 */


import { ClientDashboardShell } from '@/components/dashboard/client-dashboard-shell';
import { DashboardErrorBoundary } from '@/components/dashboard/dashboard-error-boundary';

import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard');
  }

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
