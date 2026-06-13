'use client';

/**
 * Clerk Token Bridge
 *
 * Existing data hooks (useMyProjects, useMyThreads, etc.) call
 * `getSession()` to get a Supabase access_token for Authorization headers.
 *
 * This bridge stores Clerk's token globally so getSession() can return
 * it without requiring every hook to be rewritten.
 *
 * ClerkSessionSync populates this cache whenever the user signs in
 * or the token refreshes.
 */

let cachedClerkToken: string | null = null;

export function setClerkToken(token: string | null) {
  cachedClerkToken = token;
}

export function getClerkToken(): string | null {
  return cachedClerkToken;
}

export function clerkAuthHeaders(): Record<string, string> {
  return cachedClerkToken
    ? { Authorization: `Bearer ${cachedClerkToken}` }
    : {};
}
