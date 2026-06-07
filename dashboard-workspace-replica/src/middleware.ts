/**
 * Next.js Middleware Entry Point
 *
 * Re-exports the proxy function from proxy.ts as the standard middleware export.
 * Next.js expects middleware at src/middleware.ts exporting a `middleware` function.
 *
 * The proxy module handles:
 * - Security headers (CSP, HSTS, etc.)
 * - CSRF token management (double-submit cookie pattern)
 * - Auth guard for dashboard routes
 */

export { proxy as middleware } from '@/proxy';
export { config } from '@/proxy';
