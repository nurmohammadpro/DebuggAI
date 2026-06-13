'use client';

/**
 * Safe Clerk hooks — fall back gracefully when Clerk isn't configured.
 */
import { useUser as clerkUseUser, useAuth as clerkUseAuth, useClerk as clerkUseClerk } from '@clerk/nextjs';
import { useSessionStore } from '@/store/session-store';

const clerkConfigured =
  (typeof process !== 'undefined' && (process.env?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.length || 0) > 20) ||
  (typeof window !== 'undefined' && (window as any).__NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const fallbackSignOut = () => {
  useSessionStore.getState().logout();
  window.location.href = '/';
};

export function useClerk() {
  try {
    return clerkUseClerk();
  } catch {
    return { signOut: fallbackSignOut };
  }
}

export function useUser() {
  try {
    return clerkUseUser();
  } catch {
    return { isLoaded: true, isSignedIn: false, user: null };
  }
}

export function useAuth() {
  try {
    return clerkUseAuth();
  } catch {
    return { isLoaded: true, isSignedIn: false, userId: null, getToken: async () => null };
  }
}
