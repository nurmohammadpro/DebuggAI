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

export function SessionBootstrapper() {
  const { setUser, updateUser, setCredits, logout } = useSessionStore();
  const channelRef = useRef<RealtimeChannel | null>(null);

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
            setCredits(newBalance);
          }
        )
        .subscribe();

      channelRef.current = channel;
    },
    [setCredits, unsubscribeCredits]
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
            .single(),
          supabase.from('profiles').select('is_admin').eq('id', userId).single(),
        ]);

      if (!walletError && wallet?.balance !== undefined) {
        setCredits(wallet.balance);
        await subscribeToCredits(userId);
      } else {
        setCredits(0);
      }

      const dbAdmin = !profileError ? profile?.is_admin ?? false : false;
      updateUser({ isAdmin: allowlistedAdmin || dbAdmin });
    },
    [setCredits, subscribeToCredits, updateUser]
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
          setUser({
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
        logout();
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
  }, [hydrateUser, logout, setUser, unsubscribeCredits]);

  return null;
}
