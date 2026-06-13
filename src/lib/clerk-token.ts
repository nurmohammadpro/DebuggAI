'use client';

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
