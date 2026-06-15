'use client';

import { useEffect } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { createClient as createCookieClient } from '@/lib/supabase/client';
import { useSessionStore } from '@/store/session-store';

export function shouldClearClientSession(event: AuthChangeEvent | 'INITIAL' | 'ERROR') {
  return event === 'SIGNED_OUT';
}

export function shouldClearMissingSession(hasSupabaseSession: boolean, hasCachedSession: boolean) {
  return !hasSupabaseSession && hasCachedSession;
}

async function fetchAndSetUser(store: ReturnType<typeof useSessionStore.getState>, accessToken: string, emailFallback: string) {
  store.setIsLoading(true);
  try {
    const res = await fetch('/api/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) { store.logout(); return; }
    const data = await res.json();
    store.setUser({
      id: data.id,
      email: data.email || emailFallback,
      displayName: data.displayName || data.full_name || 'Developer',
      avatarUrl: data.avatarUrl,
      plan: data.plan ?? 'free',
      credits: data.credits ?? 0,
      isAdmin: data.isAdmin ?? false,
    });
  } catch {
    store.logout();
  }
}

export function SessionBootstrapper() {
  const store = useSessionStore();

  useEffect(() => {
    // Initial session check — localStorage first
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        fetchAndSetUser(useSessionStore.getState(), session.access_token, session.user.email || '');
      } else {
        // Fallback: the middleware may have a valid cookie even when
        // localStorage does not. If we don't check, the Navigation
        // shows "Sign In" but clicking it redirects straight to
        // /dashboard/home because the middleware sees the cookie.
        const cookieClient = createCookieClient();
        cookieClient.auth.getSession().then(({ data: { session: cookieSession } }: { data: { session: Session | null } }) => {
          if (cookieSession?.user) {
            // Sync the cookie session back to localStorage so the
            // two stores stay consistent going forward.
            supabase.auth.setSession({
              access_token: cookieSession.access_token,
              refresh_token: cookieSession.refresh_token,
            }).then(() => {
              fetchAndSetUser(useSessionStore.getState(), cookieSession.access_token, cookieSession.user.email || '');
            }).catch(() => {
              store.logout();
            });
          } else {
            store.logout();
          }
        });
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' && session?.user) {
          store.setIsLoading(true);
          try {
            const res = await fetch('/api/me', {
              headers: { Authorization: `Bearer ${session.access_token}` },
            });
            if (!res.ok) { store.logout(); return; }
            const data = await res.json();
            store.setUser({
              id: data.id,
              email: data.email || session.user.email || '',
              displayName: data.displayName || data.full_name || 'Developer',
              avatarUrl: data.avatarUrl,
              plan: data.plan ?? 'free',
              credits: data.credits ?? 0,
              isAdmin: data.isAdmin ?? false,
            });
          } catch {
            store.logout();
          }
        } else if (event === 'SIGNED_OUT') {
          store.logout();
        }
      },
    );

    return () => { subscription.unsubscribe(); };
  }, [store]);

  return null;
}
