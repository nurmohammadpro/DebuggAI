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
  // 1. Clear all client state first — prevents onAuthStateChange
  //    from re-firing with stale session during the redirect.
  useSessionStore.getState().logout();
  setCachedSession(null);

  // 2. Clear Supabase's own localStorage entries explicitly.
  //    The Supabase JS client stores the session in localStorage
  //    under keys like 'sb-{ref}-auth-token'. signOut() normally
  //    handles this, but being explicit ensures nothing survives.
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth'))) {
          window.localStorage.removeItem(key);
        }
      }
    } catch {}
  }

  // 3. Call Supabase signOut — this signals the server AND
  //    fires onAuthStateChange with null session.
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // Keep going — state is already cleared above.
  }

  // 4. Aggressively clear all cookies as final cleanup.
  clearSupabaseSessionCookies();
}
