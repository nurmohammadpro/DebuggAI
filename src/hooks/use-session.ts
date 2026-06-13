/**
 * Auth Hook — Clerk-only backward compatibility layer.
 *
 * All existing hooks call (await getSession()).session?.access_token
 * to get a token. This file returns the Clerk token in that format,
 * so every single hook works without modification.
 */

import { getClerkToken } from '@/lib/clerk-token';
import { useUser, useAuth } from '@/hooks/clerk-safe';

export { useUser, useAuth };

export function useSession() {
  const { isLoaded, isSignedIn, user } = useUser();
  return {
    user: isSignedIn ? user : null,
    isReady: isLoaded,
    isLoading: !isLoaded,
  };
}

/**
 * Returns the Clerk token in the legacy { session: { access_token } } format.
 * This makes every existing (await getSession()).session?.access_token call work.
 */
export async function getSession(): Promise<{ user: null; isReady: boolean; isLoading: boolean; session: { access_token: string } | null }> {
  const token = getClerkToken();
  return {
    user: null,
    isLoading: false,
    isReady: true,
    session: token ? { access_token: token } : null,
  };
}

export function setCachedSession() {}
export function setBootstrapperReady() {}
export function getCachedSessionSnapshot() { return null; }
