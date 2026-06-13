'use client';

import { ClerkProvider } from '@clerk/nextjs';

/**
 * Only enable Clerk if NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set.
 * Falls back to plain children when Clerk is not configured —
 * the old Supabase auth middleware handles authentication instead.
 */
export function OptionalClerkProvider({ children }: { children: React.ReactNode }) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!clerkKey || clerkKey === 'pk_test_' || clerkKey.length < 10) {
    // Clerk isn't configured — Supabase auth handles everything.
    // ClerkSessionSync and all useUser/useAuth hooks will gracefully
    // return null when ClerkProvider is absent.
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
