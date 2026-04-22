/**
 * Admin Dashboard Page
 *
 * Main admin dashboard with analytics overview and navigation to other admin features.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSessionStore } from '@/store/session-store';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export default function AdminDashboardPage() {
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

  return <AdminDashboard />;
}
