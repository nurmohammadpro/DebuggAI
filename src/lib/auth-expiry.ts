'use client';

import { signOutCurrentUser } from '@/lib/client-auth';

let redirectingToLogin = false;

export function isAuthFailureStatus(status: number) {
  return status === 401 || status === 403;
}

export async function handleExpiredSession(redirectPath?: string) {
  await signOutCurrentUser();

  if (typeof window === 'undefined' || redirectingToLogin) return;
  redirectingToLogin = true;

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const loginUrl = new URL('/login', window.location.origin);
  loginUrl.searchParams.set('redirect', redirectPath || currentPath);
  window.location.replace(loginUrl.toString());
}
