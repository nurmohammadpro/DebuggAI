'use client';

import { useCallback, useEffect, useRef } from 'react';
import type {
  AuthChangeEvent,
  RealtimeChannel,
  RealtimePostgresUpdatePayload,
  Session,
} from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';
import { setCachedSession } from '@/hooks/use-session';
import { isClientEmailAdminAllowlisted } from '@/lib/admin/admin-allowlist-client';
import {
  INTERNAL_TEST_COUPON_CODE,
  INTERNAL_TEST_COUPON_EMAIL,
} from '@/lib/coupons/internal-test-coupon';

const AUTO_APPLY_KEY = 'debuggai.internal-test-coupon.applied';

export function SessionBootstrapper() {
  const { setUser, updateUser, setCredits, logout } = useSessionStore();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Use refs to avoid infinite loops with changing function dependencies
  const logoutRef = useRef(logout);
  const setUserRef = useRef(setUser);
  const setCreditsRef = useRef(setCredits);
  const updateUserRef = useRef(updateUser);

  // Update refs when functions change
  useEffect(() => {
    logoutRef.current = logout;
    setUserRef.current = setUser;
    setCreditsRef.current = setCredits;
    updateUserRef.current = updateUser;
  });

  const unsubscribeCredits = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.unsubscribe();
      channelRef.current = null;
    }
  }, []);

  const subscribeToCredits = useCallback(
    async (userId: string) => {
      await unsubscribeCredits();

      const channel = supabase
        .channel(`credits:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'credit_wallets',
            filter: `user_id=eq.${userId}`,
          },
          (payload: RealtimePostgresUpdatePayload<{ balance: number }>) => {
            const newBalance = payload.new.balance;
            setCreditsRef.current(newBalance);
          }
        );

      channel.subscribe();
      channelRef.current = channel;
    },
    [unsubscribeCredits]
  );

  const hydrateUser = useCallback(
    async (userId: string, email: string) => {
      const allowlistedAdmin = isClientEmailAdminAllowlisted(email);

      const [{ data: wallet, error: walletError }, { data: profile, error: profileError }] =
        await Promise.all([
          supabase
            .from('credit_wallets')
            .select('balance')
            .eq('user_id', userId)
            .maybeSingle(),
          supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle(),
        ]);

      if (!walletError && wallet?.balance !== undefined) {
        setCreditsRef.current(wallet.balance);
        await subscribeToCredits(userId);
      } else {
        setCreditsRef.current(0);
      }

      const dbAdmin = !profileError ? profile?.is_admin ?? false : false;
      updateUserRef.current({ isAdmin: allowlistedAdmin || dbAdmin });

      // Auto-apply the internal testing coupon for the approved email only.
      // This keeps the flow invisible for the test user while remaining scoped.
      if (email.toLowerCase() === INTERNAL_TEST_COUPON_EMAIL) {
        try {
          const appliedKey = `${AUTO_APPLY_KEY}:${userId}`;
          const alreadyApplied =
            typeof window !== 'undefined' && window.localStorage.getItem(appliedKey) === '1';

          const alreadyUnlimited =
            (wallet?.balance ?? 0) >= 1_000_000 || (profile as { plan_type?: string } | null)?.plan_type === 'enterprise';

          if (!alreadyApplied && !alreadyUnlimited) {
            const response = await fetch('/api/coupons/redeem', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({ couponCode: INTERNAL_TEST_COUPON_CODE }),
            });

            if (response.ok) {
              const payload = await response.json().catch(() => ({}));
              if (typeof payload?.credits === 'number') {
                setCreditsRef.current(payload.credits);
              }
              updateUserRef.current({ plan: 'enterprise', credits: payload?.credits ?? 1_000_000 });
              if (typeof window !== 'undefined') {
                window.localStorage.setItem(appliedKey, '1');
              }
            }
          }
        } catch {
          // best-effort: keep login working even if the coupon endpoint is unavailable
        }
      }
    },
    [subscribeToCredits]
  );

  useEffect(() => {
    let active = true;
    let hydrating = false;

    const handleSession = async (session: Session | null) => {
      if (!active) return;

      if (session?.user) {
        if (hydrating) return;
        hydrating = true;
        try {
          const email = session.user.email || '';
          setUserRef.current({
            id: session.user.id,
            email,
            displayName:
              session.user.user_metadata.full_name ||
              session.user.email ||
              'Developer',
            avatarUrl: session.user.user_metadata.avatar_url,
            plan: session.user.user_metadata.plan || 'free',
            credits: 0,
            isAdmin: null,
          });
          await hydrateUser(session.user.id, email);
        } finally {
          hydrating = false;
        }
      } else {
        await unsubscribeCredits();
        logoutRef.current();
      }
    };

    // onAuthStateChange fires synchronously with the current session on subscribe,
    // so we don't need a separate getSession() call that would race with it.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      setCachedSession(session);
      await handleSession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
      unsubscribeCredits();
    };
  }, []);

  return null;
}
