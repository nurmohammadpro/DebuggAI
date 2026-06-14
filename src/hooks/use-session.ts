/**
 * Auth Hook — Clerk-only backward compatibility layer.
 *
 * All existing hooks call (await getSession()).session?.access_token
 * to get a token. This file returns the Clerk token in that format,
 * so every single hook works without modification.
 */

import { getClerkToken } from '@/lib/clerk-token';
import { useUser } from '@/hooks/clerk-safe';
import { useSessionStore } from '@/store/session-store';

export { useUser };

type LegacySessionUser = {
  id: string;
  email?: string | null;
};

export function useSession() {
  const { isLoaded, isSignedIn, user } = useUser() as {
    isLoaded: boolean;
    isSignedIn: boolean;
    user: LegacySessionUser | null;
  };
  const mappedUser = useSessionStore((state) => state.user);
  const storeLoading = useSessionStore((state) => state.isLoading);

  return {
    user: isSignedIn ? mappedUser : null,
    isReady: isLoaded,
    isLoading: !isLoaded || (isSignedIn && storeLoading),
  };
}

/**
 * Returns the Clerk token in the legacy { session: { access_token } } format.
 * This makes every existing (await getSession()).session?.access_token call work.
 */
export async function getSession(): Promise<{ user: LegacySessionUser | null; isReady: boolean; isLoading: boolean; session: { access_token: string; user?: LegacySessionUser | null } | null }> {
  const token = getClerkToken();
  const user = useSessionStore.getState().user;
  return {
    user,
    isLoading: false,
    isReady: true,
    session: token ? { access_token: token, user } : null,
  };
}

export function setCachedSession(..._args: unknown[]) {}
export function setBootstrapperReady() {}
export function getCachedSessionSnapshot() { return null; }
