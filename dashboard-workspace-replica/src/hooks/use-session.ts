/**
 * Centralized Session Hook
 *
 * Reads from the module-level session cache populated by SessionBootstrapper.
 * Never calls getSession() directly — avoids lock contention from concurrent calls.
 */

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';

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
 * Returns the cached session state synchronously when available.
 * Components that need the Supabase Session object (for access_token) should
 * use getSession() which returns the session from cache — no network call.
 */
export async function getSession(): Promise<SessionState & { session?: Session | null }> {
  // Already cached from SessionBootstrapper's onAuthStateChange
  if (cachedSession || cachedSessionError) {
    return { ...deriveState(), session: cachedSession };
  }

  // Fallback: wait for the bootstrapper to populate the cache.
  // onAuthStateChange fires synchronously on subscribe, so this race is rare.
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
