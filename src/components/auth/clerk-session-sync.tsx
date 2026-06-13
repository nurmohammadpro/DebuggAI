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
      // Mark auth as loaded — populates backward-compat store user
      store.setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        displayName: user.fullName || user.firstName || 'Developer',
        avatarUrl: user.imageUrl,
        plan: 'free',
        credits: 0,
        isAdmin: false,
      });

      // Populate the global token cache for data hooks
      getToken().then((token: string | null) => { if (token) setClerkToken(token); });

      // Fetch credits and plan from Supabase
      if (!syncedRef.current) {
        syncedRef.current = true;
        getToken().then(async (token: string | null) => {
          if (!token) return;
          try {
            const res = await fetch('/api/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              store.setUser({
                id: user.id,
                email: user.primaryEmailAddress?.emailAddress || '',
                displayName: user.fullName || user.firstName || 'Developer',
                avatarUrl: user.imageUrl,
                plan: data.plan ?? 'free',
                credits: data.credits ?? 0,
                isAdmin: data.isAdmin ?? false,
              });
            }
          } catch {
            // best-effort, defaults already set
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
