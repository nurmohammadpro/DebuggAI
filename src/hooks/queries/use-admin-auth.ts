'use client';

import { getSession } from '@/hooks/use-session';

export async function getAdminAuthHeaders() {
  const { session } = await getSession();

  if (!session?.access_token) {
    throw new Error('Unauthorized');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${session.access_token}`,
  };

  // Attach CSRF token from cookie for state-changing requests
  if (typeof document !== 'undefined') {
    const m = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
    if (m?.[1]) headers['x-csrf-token'] = m[1];
  }

  return headers;
}

