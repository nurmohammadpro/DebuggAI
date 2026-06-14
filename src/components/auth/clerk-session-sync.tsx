'use client';

import { useEffect, useRef } from 'react';
import { useUser, useAuth } from '@/hooks/clerk-safe';
import { useSessionStore } from '@/store/session-store';
import { setClerkToken } from '@/lib/clerk-token';

export function ClerkSessionSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const store = useSessionStore();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      // Populate the global token cache for data hooks
      store.setIsLoading(true);
      getToken().then((token: string | null) => { if (token) setClerkToken(token); });

      // Fetch the mapped Supabase profile id before marking the app authenticated.
      // Clerk ids look like user_xxx, while our existing Supabase user_id columns
      // are UUIDs. Hydrating the store with the raw Clerk id causes 400s/empty
      // project history after refresh.
      if (!syncedRef.current) {
        syncedRef.current = true;
        getToken().then(async (token: string | null) => {
          if (!token) {
            store.logout();
            return;
          }
          try {
            const res = await fetch('/api/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
              store.logout();
              return;
            }
            const data = await res.json();
            store.setUser({
              id: data.id,
              email: data.email || user.primaryEmailAddress?.emailAddress || '',
              displayName: data.displayName || user.fullName || user.firstName || 'Developer',
              avatarUrl: data.avatarUrl || user.imageUrl,
              plan: data.plan ?? 'free',
              credits: data.credits ?? 0,
              isAdmin: data.isAdmin ?? false,
            });
          } catch {
            store.logout();
          }
        });
      }
    } else {
      store.logout();
      syncedRef.current = false;
    }
  }, [isLoaded, isSignedIn, user, getToken, store]);

  return null;
}
