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
  error: Error | null;
}

// Module-level session cache — set by SessionBootstrapper's onAuthStateChange
let cachedSession: Session | null = null;
let cachedSessionError: Error | null = null;
const listeners: Set<(state: SessionState) => void> = new Set();

function deriveState(): SessionState {
  return {
    user: cachedSession?.user || null,
    isLoading: false,
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

  // Last resort: wait for the bootstrapper to populate the cache.
  return new Promise((resolve) => {
    const check = () => {
      if (cachedSession || cachedSessionError) {
        resolve({ ...deriveState(), session: cachedSession });
        return;
      }
      setTimeout(check, 50);
    };
    check();
  });
}
