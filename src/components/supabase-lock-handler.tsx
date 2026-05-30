'use client';

import { useEffect } from 'react';

/**
 * Suppresses unhandled promise rejections from @supabase/auth-js cross-tab lock
 * contention. The library uses localStorage for cross-tab synchronization even when
 * auth tokens are stored in cookies. When multiple tabs are open, the lock can be
 * "stolen" causing an unhandled rejection during module initialization.
 *
 * This error is harmless — the underlying getSession() call still resolves correctly
 * via the cookie — but Next.js/Turbopack surfaces it as a console error if unhandled.
 */
export function SupabaseLockHandler() {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const message =
        typeof event.reason === 'string'
          ? event.reason
          : event.reason?.message ?? event.reason?.reason ?? '';

      if (
        typeof message === 'string' &&
        message.includes('Lock "lock:sb-') &&
        message.includes('-auth-token"')
      ) {
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  return null;
}
