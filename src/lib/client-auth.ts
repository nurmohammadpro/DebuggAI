'use client';

import { supabase } from '@/lib/supabase';
import { setCachedSession } from '@/hooks/use-session';
import { useSessionStore } from '@/store/session-store';

function clearSupabaseSessionCookies() {
  if (typeof document === 'undefined') return;

  // Clear ALL cookies on the current domain — aggressively ensures
  // Supabase auth tokens, refresh tokens, and any stale session
  // cookies are removed regardless of naming convention.
  const cookieNames = document.cookie
    .split(';')
    .map((cookie) => cookie.trim().split('=')[0]!)
    .filter((name) => name.length > 0);

  for (const name of cookieNames) {
    // Clear every cookie — not just sb- or supabase- prefixed ones.
    // Some deployments or proxy setups may rename or alias cookies.
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Strict`;
    // Also clear on parent domain (for subdomain setups)
    document.cookie = `${name}=; Path=/; Max-Age=0; Domain=.${window.location.hostname}; SameSite=Lax`;
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
