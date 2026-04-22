/**
 * Admin Users Management Page
 *
 * View, search, filter, and manage all users on the platform.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSessionStore } from '@/store/session-store';
import { AdminUsers } from '@/components/admin/admin-users';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useSessionStore();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) router.push('/login');
      else if (!user?.isAdmin) router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router, user?.isAdmin]);

  if (isLoading) return null;
  if (!isAuthenticated || !user?.isAdmin) return null;

  return <AdminUsers />;
}

