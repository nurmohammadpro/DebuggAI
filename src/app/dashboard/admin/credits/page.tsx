/**
 * Admin Credits Management Page
 *
 * View all credit transactions and manually adjust user balances.
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useSessionStore } from '@/store/session-store';
import { AdminCredits } from '@/components/admin/admin-credits';

export default function AdminCreditsPage() {
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

  return <AdminCredits />;
}

