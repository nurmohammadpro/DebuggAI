/**
 * Admin Users Management Page
 *
 * View, search, filter, and manage all users on the platform.
 */

import { AdminUsers } from '@/components/admin/admin-users';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';

export default function AdminUsersPage() {
  return (
    <AdminRouteGuard>
      <AdminUsers />
    </AdminRouteGuard>
  );
}
