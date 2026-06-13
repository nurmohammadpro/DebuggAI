'use client';

import { useCallback, useEffect, useRef } from 'react';
import type {
  AuthChangeEvent,
  RealtimeChannel,
  RealtimePostgresUpdatePayload,
  Session,
} from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSessionStore, type PlanType } from '@/store/session-store';
import {
  getCachedSessionSnapshot,
  setCachedSession,
  setBootstrapperReady,
} from '@/hooks/use-session';
import { isClientEmailAdminAllowlisted } from '@/lib/admin/admin-allowlist-client';
import { csrfHeader } from '@/lib/csrf-client';
import {
  INTERNAL_TEST_COUPON_CODE,
  INTERNAL_TEST_COUPON_EMAIL,
} from '@/lib/coupons/internal-test-coupon';

const AUTO_APPLY_KEY = 'debuggai.internal-test-coupon.applied';

export function shouldClearClientSession(event: AuthChangeEvent | 'INITIAL' | 'ERROR') {
  return event === 'SIGNED_OUT';
}

export function shouldClearMissingSession(hasSupabaseSession: boolean, hasCachedSession: boolean) {
  return !hasSupabaseSession && hasCachedSession;
}

function redirectToLoginIfDashboard() {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  if (!pathname.startsWith('/dashboard')) return;

  const redirect = `${pathname}${search}`;
  const loginUrl = new URL('/login', window.location.origin);
  loginUrl.searchParams.set('redirect', redirect);
  window.location.replace(loginUrl.toString());
}

export function SessionBootstrapper() {
  const { setUser, updateUser, setCredits, setIsLoading, logout } = useSessionStore();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Use refs to avoid infinite loops with changing function dependencies
  const logoutRef = useRef(logout);
  const setUserRef = useRef(setUser);
  const setCreditsRef = useRef(setCredits);
  const setIsLoadingRef = useRef(setIsLoading);
  const updateUserRef = useRef(updateUser);

  // Update refs when functions change
  useEffect(() => {
    logoutRef.current = logout;
    setUserRef.current = setUser;
    setCreditsRef.current = setCredits;
    setIsLoadingRef.current = setIsLoading;
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
          supabase.from('profiles').select('is_admin, plan_type').eq('id', userId).maybeSingle(),
        ]);

      if (!walletError && wallet?.balance !== undefined) {
        setCreditsRef.current(wallet.balance);
        await subscribeToCredits(userId);
      } else {
        setCreditsRef.current(0);
      }

      const dbAdmin = !profileError ? profile?.is_admin ?? false : false;
      const dbPlan = !profileError ? (profile?.plan_type ?? 'free') : 'free';
      const effectivePlan: PlanType = allowlistedAdmin || dbAdmin ? 'enterprise' : (dbPlan as PlanType);
      updateUserRef.current({ isAdmin: allowlistedAdmin || dbAdmin });
      updateUserRef.current({ plan: effectivePlan });

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
              headers: {
                'Content-Type': 'application/json',
                ...csrfHeader(),
              },
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
    let initialSessionLoaded = false;

    const handleSession = async (
      session: Session | null,
      options: { clearClientSession?: boolean } = {},
    ) => {
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
            plan: 'free',
            credits: 0,
            isAdmin: null,
          });
          await hydrateUser(session.user.id, email);
        } finally {
          hydrating = false;
        }
      } else if (options.clearClientSession) {
        await unsubscribeCredits();
        logoutRef.current();
        redirectToLoginIfDashboard();
      } else {
        setIsLoadingRef.current(false);
      }
    };

    setIsLoadingRef.current(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const cachedSession = getCachedSessionSnapshot();
      const clearClientSession =
        shouldClearClientSession(event) ||
        (event === 'INITIAL_SESSION' && shouldClearMissingSession(!!session, !!cachedSession));
      const sessionToHydrate = session ?? (clearClientSession ? null : cachedSession);

      if (session || clearClientSession || event === 'INITIAL_SESSION') {
        setCachedSession(session);
      }

      if (sessionToHydrate || initialSessionLoaded || clearClientSession) {
        await handleSession(sessionToHydrate, { clearClientSession });
      }
    });

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!active) return;

        const cachedSession = getCachedSessionSnapshot();
        const clearClientSession = shouldClearMissingSession(!!data?.session, !!cachedSession);
        const sessionToHydrate = data?.session ?? null;

        setCachedSession(
          data?.session ?? null,
          error ? new Error(error.message) : null,
        );

        await handleSession(sessionToHydrate, { clearClientSession });
      } catch (error) {
        if (!active) return;
        const cachedSession = getCachedSessionSnapshot();
        if (!cachedSession) {
          setCachedSession(null, error instanceof Error ? error : new Error('Failed to load session'));
        }
        await handleSession(cachedSession);
      } finally {
        if (!active) return;
        initialSessionLoaded = true;
        setBootstrapperReady();
      }
    })();

    return () => {
      active = false;
      subscription.unsubscribe();
      unsubscribeCredits();
    };
  }, []);

  return null;
}
