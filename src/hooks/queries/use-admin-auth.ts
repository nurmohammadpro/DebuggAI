'use client';

import { supabase } from '@/lib/supabase';

export async function getAdminAuthHeaders() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Unauthorized');
  }

  return { Authorization: `Bearer ${session.access_token}` };
}

