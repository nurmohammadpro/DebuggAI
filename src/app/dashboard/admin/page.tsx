/**
 * Admin Dashboard Page
 *
 * Main admin dashboard with analytics overview and navigation to other admin features.
 */

import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';

export default function AdminDashboardPage() {
  return (
    <AdminRouteGuard>
      <AdminDashboard />
    </AdminRouteGuard>
  );
}
