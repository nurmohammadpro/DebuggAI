import 'server-only';
import type { NextRequest } from 'next/server';

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const TOKEN_BYTES = 32;

export function generateCsrfToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function getCsrfCookieHeader(token: string): string {
  // NOT HttpOnly — the double-submit pattern requires JS to read this cookie
  // so it can send the matching X-CSRF-Token header. SameSite=Strict prevents
  // the cookie from being sent on cross-site requests; the custom header
  // requirement prevents cross-site forms from forging requests.
  return `${CSRF_COOKIE}=${token}; Path=/; SameSite=Strict; Secure; Max-Age=86400`;
}

export function getCsrfClearCookieHeader(): string {
  return `${CSRF_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0`;
}

/**
 * Validate CSRF token for state-changing requests.
 * Uses double-submit cookie pattern: the cookie value must match the header value.
 */
export function validateCsrfToken(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER) || req.headers.get(CSRF_HEADER.toUpperCase());
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== TOKEN_BYTES * 2) return false;
  // Constant-time comparison
  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ (headerToken.charCodeAt(i) || 0);
  }
  return mismatch === 0 && headerToken.length === cookieToken.length;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Check whether a request needs CSRF validation.
 * Read-only methods (GET, HEAD, OPTIONS) are excluded.
 */
export function requiresCsrfValidation(req: NextRequest): boolean {
  return !SAFE_METHODS.has(req.method);
}
