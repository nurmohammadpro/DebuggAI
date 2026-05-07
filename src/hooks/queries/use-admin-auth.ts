'use client';

import { getSession } from '@/hooks/use-session';

export async function getAdminAuthHeaders() {
  const { session } = await getSession();

  if (!session?.access_token) {
    throw new Error('Unauthorized');
  }

  return { Authorization: `Bearer ${session.access_token}` };
}

