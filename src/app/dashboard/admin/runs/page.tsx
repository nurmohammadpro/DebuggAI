/**
 * Admin Runs Dashboard Page
 *
 * View, search, filter, cancel, and retry all runs across all users.
 */

import { AdminRunsDashboard } from '@/components/admin/admin-runs-dashboard';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';

export default function AdminRunsPage() {
  return (
    <AdminRouteGuard>
      <AdminRunsDashboard />
    </AdminRouteGuard>
  );
}
