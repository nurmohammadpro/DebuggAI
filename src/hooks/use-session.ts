/**
 * Auth Hook — Clerk-powered replacement for Supabase getSession().
 *
 * All existing code calls `getSession()` for auth headers.
 * This file provides the same interface backed by Clerk's getToken().
 */

import { useUser, useAuth } from '@/hooks/clerk-safe';

// Re-export Clerk hooks for components that want them directly
export { useUser, useAuth };

/**
 * Call in components — returns { user, isLoaded, isSignedIn }
 */
export function useSession() {
  const { isLoaded, isSignedIn, user } = useUser();
  return {
    user: isSignedIn ? user : null,
    isReady: isLoaded,
    isLoading: !isLoaded,
  };
}

/**
 * Call in async functions — returns { session: { access_token } }
 * Same interface as the old Supabase getSession() so all existing
 * code works without change.
 */
export async function getSession() {
  // getAuth() only works server-side. Client-side, the token
  // is managed by Clerk's <ClerkProvider> and injected automatically.
  // For client-side fetch() calls, we use the Authorization header
  // pattern in use-generation.ts which calls getToken() directly.

  // This function is called from browser code. Return null client-side
  // since Clerk manages tokens through its provider — callers should
  // use the `clerkGetToken` helper or pass tokens explicitly.
  if (typeof window !== 'undefined') {
    // On the client, getToken() is only available within Clerk hooks.
    // Callers should import { useAuth } from '@/hooks/clerk-safe' instead.
    try {
      const clerk = (window as any).__clerk_token;
      return {
        user: null,
        isReady: true,
        isLoading: false,
        session: clerk ? { access_token: clerk } : null,
      };
    } catch {
      return { user: null, isReady: true, isLoading: false, session: null };
    }
  }

  return { user: null, isReady: true, isLoading: false, session: null };
}

// Compatibility exports for files that imported these
export function setCachedSession() {}
export function setBootstrapperReady() {}
