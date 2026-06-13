'use client';

/**
 * Safe Clerk hooks — return null/empty states when Clerk isn't configured.
 *
 * All components that import useUser / useAuth / useClerk should import
 * from here instead of '@clerk/nextjs' so the app doesn't crash when
 * NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing in production.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UserResource = any;
import { useSessionStore } from '@/store/session-store';

const clerkConfigured =
  typeof window !== 'undefined' &&
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.length || 0) > 20;

// ── Lazy imports to avoid module-init errors ──
async function importClerkHooks() {
  if (!clerkConfigured) return null;
  try {
    return await import('@clerk/nextjs');
  } catch {
    return null;
  }
}

// ── useClerk (for signOut) ──
export function useClerk() {
  const store = useSessionStore();
  if (!clerkConfigured) {
    return {
      signOut: async () => {
        store.logout();
        window.location.href = '/';
      },
    };
  }

  // Clerk IS configured. Try the real hook if we're inside ClerkProvider.
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useClerk: realUseClerk } = require('@clerk/nextjs');
    return realUseClerk();
  } catch {
    return {
      signOut: async () => {
        store.logout();
        window.location.href = '/';
      },
    };
  }
}

// ── useUser ──
export function useUser() {
  if (!clerkConfigured) {
    return {
      isLoaded: true,
      isSignedIn: false,
      user: null as UserResource | null,
    };
  }

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useUser: realUseUser } = require('@clerk/nextjs');
    return realUseUser();
  } catch {
    return {
      isLoaded: true,
      isSignedIn: false,
      user: null as UserResource | null,
    };
  }
}

// ── useAuth ──
export function useAuth() {
  if (!clerkConfigured) {
    return {
      isLoaded: true,
      isSignedIn: false,
      userId: null as string | null,
      getToken: async () => null as string | null,
    };
  }
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { useAuth: realUseAuth } = require('@clerk/nextjs');
    return realUseAuth();
  } catch {
    return {
      isLoaded: true,
      isSignedIn: false,
      userId: null as string | null,
      getToken: async () => null as string | null,
    };
  }
}
