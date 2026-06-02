'use client';

import { supabase } from '@/lib/supabase';
import { setCachedSession } from '@/hooks/use-session';
import { useSessionStore } from '@/store/session-store';

function clearSupabaseSessionCookies() {
  if (typeof document === 'undefined') return;

  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0])
    .filter((name) => name.length > 0);

  for (const name of cookieNames) {
    if (!name.startsWith('sb-') && !name.startsWith('supabase-')) continue;
    if (!name.includes('auth-token') && !name.includes('refresh-token') && !name.includes('code-verifier')) continue;

    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

export async function signOutCurrentUser() {
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // Keep going — we still want to clear client state if Supabase is unavailable.
  }

  clearSupabaseSessionCookies();
  setCachedSession(null);
  useSessionStore.getState().logout();
}
