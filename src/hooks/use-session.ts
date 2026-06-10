/**
 * Centralized Session Hook
 *
 * useSession() reads from the module-level session cache populated by
 * SessionBootstrapper's onAuthStateChange listener.
 *
 * getSession() always calls supabase.auth.getSession() to guarantee a
 * fresh token — expired tokens are auto-refreshed via the refresh token
 * stored in cookies by @supabase/ssr.
 */

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface SessionState {
  user: User | null;
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
}

// Module-level session cache — set by SessionBootstrapper's onAuthStateChange
let cachedSession: Session | null = null;
let cachedSessionError: Error | null = null;
let bootstrapperReady = false;
const pendingResolvers: Array<() => void> = [];
const listeners: Set<(state: SessionState) => void> = new Set();

function deriveState(): SessionState {
  return {
    user: cachedSession?.user || null,
    isLoading: !bootstrapperReady,
    isReady: bootstrapperReady,
    error: cachedSessionError,
  };
}

function notifyListeners() {
  const state = deriveState();
  listeners.forEach((fn) => fn(state));
}

/** Called by SessionBootstrapper when auth state changes */
export function setCachedSession(session: Session | null, error?: Error | null) {
  cachedSession = session;
  cachedSessionError = error ?? null;
  notifyListeners();
}

/**
 * Called by SessionBootstrapper after its onAuthStateChange listener
 * is registered. Allows getSession() to distinguish "not yet initialized"
 * from "session is definitively null."
 */
export function setBootstrapperReady() {
  bootstrapperReady = true;
  const resolvers = pendingResolvers.splice(0);
  resolvers.forEach((fn) => fn());
}

export function useSession() {
  const [state, setState] = useState<SessionState>(deriveState);

  useEffect(() => {
    listeners.add(setState);
    // Sync immediately in case cache was populated before this component mounted
    setState(deriveState());
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}

/**
 * Returns a session with a guaranteed-fresh access token.
 * Calls supabase.auth.getSession() which auto-refreshes expired tokens
 * using the refresh token cookie set by @supabase/ssr.
 */
export async function getSession(): Promise<SessionState & { session?: Session | null }> {
  // Always go through Supabase to guarantee a fresh token.
  // supabase.auth.getSession() returns the cached session when valid,
  // and automatically refreshes expired tokens via the refresh token
  // stored in cookies by @supabase/ssr's createBrowserClient.
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('[getSession] Supabase getSession error:', error);
    }
    if (data?.session) {
      setCachedSession(data.session);
      return { ...deriveState(), session: data.session };
    }
  } catch (e) {
    console.warn('[getSession] Supabase getSession threw:', e);
  }

  // Fallback: return module cache if Supabase call didn't produce a session
  if (cachedSession || cachedSessionError) {
    return { ...deriveState(), session: cachedSession };
  }

  // If bootstrapper has initialized, cached value is definitive.
  if (bootstrapperReady) {
    return { ...deriveState(), session: cachedSession };
  }

  // Bootstraper hasn't initialized yet — wait for it, with a timeout.
  return new Promise((resolve) => {
    const start = Date.now();
    pendingResolvers.push(() => resolve({ ...deriveState(), session: cachedSession }));

    const poll = () => {
      if (bootstrapperReady) {
        resolve({ ...deriveState(), session: cachedSession });
        return;
      }
      if (Date.now() - start > 5000) {
        console.warn('[getSession] timeout waiting for bootstrapper — returning null');
        resolve({ ...deriveState(), session: null });
        return;
      }
      setTimeout(poll, 50);
    };
    poll();
  });
}
