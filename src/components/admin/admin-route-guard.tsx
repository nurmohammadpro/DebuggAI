'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import { useSessionStore } from '@/store/session-store';

export function AdminRouteGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useSessionStore();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (user?.isAdmin === false) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router, user?.isAdmin]);

  if (isLoading || user?.isAdmin === null) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || user?.isAdmin !== true) return null;

  return <>{children}</>;
}

