/**
 * Centralized Session Hook
 *
 * Prevents multiple simultaneous getSession calls that cause auth lock errors
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

interface SessionState {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

let globalSessionState: SessionState | null = null;
let sessionListeners: Set<(state: SessionState) => void> = new Set();
let sessionPromise: Promise<SessionState> | null = null;

function updateSessionState(state: SessionState) {
  globalSessionState = state;
  sessionListeners.forEach(listener => listener(state));
}

async function fetchSession(): Promise<SessionState> {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      const state: SessionState = { user: null, isLoading: false, error };
      updateSessionState(state);
      return state;
    }

    const state: SessionState = {
      user: data.session?.user || null,
      isLoading: false,
      error: null
    };
    updateSessionState(state);
    return state;
  } catch (error) {
    const state: SessionState = {
      user: null,
      isLoading: false,
      error: error instanceof Error ? error : new Error('Failed to get session')
    };
    updateSessionState(state);
    return state;
  }
}

export function useSession() {
  const [sessionState, setSessionState] = useState<SessionState>(() => {
    // Return cached state if available, otherwise start with loading
    return globalSessionState || { user: null, isLoading: true, error: null };
  });

  useEffect(() => {
    // Add listener
    sessionListeners.add(setSessionState);

    // Set current state
    if (globalSessionState) {
      setSessionState(globalSessionState);
    }

    // Fetch session if not already loading or loaded
    if (!sessionPromise && (!globalSessionState || globalSessionState.isLoading)) {
      sessionPromise = fetchSession().finally(() => {
        sessionPromise = null;
      });
    }

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const state: SessionState = {
        user: session?.user || null,
        isLoading: false,
        error: null
      };
      updateSessionState(state);
    });

    return () => {
      sessionListeners.delete(setSessionState);
      subscription.unsubscribe();
    };
  }, []);

  return sessionState;
}

export async function getSession(): Promise<SessionState> {
  if (sessionPromise) {
    return sessionPromise;
  }

  if (globalSessionState && !globalSessionState.isLoading) {
    return globalSessionState;
  }

  sessionPromise = fetchSession().finally(() => {
    sessionPromise = null;
  });

  return sessionPromise;
}
