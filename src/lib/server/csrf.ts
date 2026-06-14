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
  return `${CSRF_COOKIE}=${token}; Path=/; SameSite=Strict; Secure; Max-Age=86400`;
}

export function getCsrfClearCookieHeader(): string {
  return `${CSRF_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Secure; Max-Age=0`;
}

export function validateCsrfToken(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = req.headers.get(CSRF_HEADER) || req.headers.get(CSRF_HEADER.toUpperCase());
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== TOKEN_BYTES * 2) return false;
  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ (headerToken.charCodeAt(i) || 0);
  }
  return mismatch === 0 && headerToken.length === cookieToken.length;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requiresCsrfValidation(req: NextRequest): boolean {
  return !SAFE_METHODS.has(req.method);
}
