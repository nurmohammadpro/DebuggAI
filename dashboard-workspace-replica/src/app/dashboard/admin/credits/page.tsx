/**
 * Admin Credits Management Page
 *
 * View all credit transactions and manually adjust user balances.
 */

import { AdminCredits } from '@/components/admin/admin-credits';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';

export default function AdminCreditsPage() {
  return (
    <AdminRouteGuard>
      <AdminCredits />
    </AdminRouteGuard>
  );
}
