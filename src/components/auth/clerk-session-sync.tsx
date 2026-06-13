'use client';

import { useEffect, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useSessionStore } from '@/store/session-store';
import { setClerkToken } from '@/lib/clerk-token';

/**
 * Syncs Clerk's auth state into our Zustand session store and
 * stores the token globally so getSession() can provide it to
 * existing data hooks without requiring them to import Clerk directly.
 *
 * Place once at the root of the dashboard layout.
 */
export function ClerkSessionSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const store = useSessionStore();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (isSignedIn && user) {
      // Populate backward-compat store.getState().setUser for old consumers
      store.setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress || '',
        displayName: user.fullName || user.firstName || 'Developer',
        avatarUrl: user.imageUrl,
        plan: 'free',
        credits: 0,
        isAdmin: false,
      });

      // Mark auth as loaded
      store.setLoaded(true);

      // Populate the global token cache so data hooks can use it
      getToken().then((token) => setClerkToken(token));

      // Fetch or hydrate user profile (credits, plan) from Supabase
      if (!syncedRef.current) {
        syncedRef.current = true;
        getToken().then(async (token) => {
          if (!token) return;
          try {
            const res = await fetch('/api/me', {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              store.setProfile({
                credits: data.credits ?? 0,
                plan: data.plan ?? 'free',
                isAdmin: data.isAdmin ?? false,
              });
            }
          } catch {
            store.setProfile({ credits: 0, plan: 'free', isAdmin: false });
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
