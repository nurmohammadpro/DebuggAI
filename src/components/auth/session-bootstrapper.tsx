'use client';

import { useEffect } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';

export function shouldClearClientSession(event: AuthChangeEvent | 'INITIAL' | 'ERROR') {
  return event === 'SIGNED_OUT';
}

export function shouldClearMissingSession(hasSupabaseSession: boolean, hasCachedSession: boolean) {
  return !hasSupabaseSession && hasCachedSession;
}

export function SessionBootstrapper() {
  const store = useSessionStore();

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      if (session?.user) {
        store.setIsLoading(true);
        fetch('/api/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
          .then((res) => {
            if (!res.ok) { store.logout(); return; }
            return res.json();
          })
          .then((data) => {
            if (!data) return;
            store.setUser({
              id: data.id,
              email: data.email || session.user.email || '',
              displayName: data.displayName || data.full_name || 'Developer',
              avatarUrl: data.avatarUrl,
              plan: data.plan ?? 'free',
              credits: data.credits ?? 0,
              isAdmin: data.isAdmin ?? false,
            });
          })
          .catch(() => store.logout());
      } else {
        store.logout();
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
