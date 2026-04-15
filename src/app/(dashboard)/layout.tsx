/**
 * Dashboard Layout
 */

import { Navigation } from '@/components/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main>{children}</main>
    </div>
  );
}
