'use client';



let redirectingToLogin = false;

export function isAuthFailureStatus(status: number) {
  return status === 401 || status === 403;
}

export async function handleExpiredSession(redirectPath?: string) {
  await console.log('signed out')

  if (typeof window === 'undefined' || redirectingToLogin) return;
  redirectingToLogin = true;

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const loginUrl = new URL('/login', window.location.origin);
  loginUrl.searchParams.set('redirect', redirectPath || currentPath);
  window.location.replace(loginUrl.toString());
}
