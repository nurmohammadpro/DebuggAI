/**
 * Private Layout - For dashboard pages
 * No Navigation or Footer
 */

import { SessionBootstrapper } from '@/components/auth/session-bootstrapper';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SessionBootstrapper />
      <main>{children}</main>
    </div>
  );
}
