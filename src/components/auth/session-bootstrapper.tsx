'use client';

import { useEffect } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';

export function SessionBootstrapper() {
  // IMPORTANT: Do NOT use `useSessionStore()` (no selector) as an effect dependency.
  // It returns the full state object which changes on every setter call, causing an
  // infinite loop: state change → re-render → new `store` ref → cleanup (unsubscribes
  // onAuthStateChange) → re-run effect → getSession() → state change → ...
  //
  // Use an empty deps array instead — this effect runs once on mount. The
  // onAuthStateChange subscription handles all subsequent state transitions.
  useEffect(() => {
    let cancelled = false;

    // Initial session check — one-shot; never create a second Supabase client
    // which would race on the gotrue lock.
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (cancelled) return;
      const store = useSessionStore.getState();
      if (session?.user) {
        fetchAndSetUser(store, session.access_token, session.user.email || '');
      } else {
        // No localStorage session. The middleware handles cookie-based auth
        // for route protection, so there is no need to re-check with a second
        // client — that would only cause gotrue lock contention.
        store.logout();
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (cancelled) return;
        const store = useSessionStore.getState();

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

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return null;
}

async function fetchAndSetUser(
  store: ReturnType<typeof useSessionStore.getState>,
  accessToken: string,
  emailFallback: string,
) {
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
