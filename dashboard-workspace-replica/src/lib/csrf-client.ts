/**
 * Client-side CSRF token reader.
 *
 * Import this in any component that makes raw fetch() calls to attach the
 * CSRF token header to state-changing requests.
 *
 * Usage:
 *   import { csrfHeader } from '@/lib/csrf-client';
 *   headers: { ...csrfHeader(), 'Content-Type': 'application/json' }
 */

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match?.[1] || null;
}

export function csrfHeader(): Record<string, string> {
  const token = getCsrfToken();
  return token ? { 'x-csrf-token': token } : {};
}
