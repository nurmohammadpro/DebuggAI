/**
 * Supabase Client Setup
 *
 * Uses @supabase/ssr for cookie-based session management to avoid
 * localStorage lock contention (the "lock was not released" error).
 *
 * Lazily initializes the browser client so it doesn't crash during SSR.
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function createMissingEnvProxy() {
  const message =
    'Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY).';

  return new Proxy({} as any, {
    get() {
      throw new Error(message);
    },
  });
}

function createBrowserSupabaseClient() {
  if (typeof document === 'undefined') {
    // This browser client should only be used on the client side.
    // On the server, use supabase-server.ts (createClient / createAdminClient).
    return new Proxy({} as any, {
      get() {
        throw new Error(
          'Supabase browser client is not available during SSR. ' +
          'Use createClient() from "@/lib/supabase-server" on the server side.'
        );
      },
    });
  }

  return createBrowserClient(supabaseUrl!, supabaseAnonKey!, {
    cookieEncoding: 'base64url',
  });
}

let _supabase: ReturnType<typeof createBrowserSupabaseClient> | null = null;

function getSupabase() {
  if (!_supabase) {
    _supabase = supabaseUrl && supabaseAnonKey
      ? createBrowserSupabaseClient()
      : createMissingEnvProxy();
  }
  return _supabase;
}

/**
 * Lazily-initialized browser Supabase client.
 * Safe to import in server contexts (returns a proxy that throws on use).
 */
export const supabase = new Proxy({} as any, {
  get(_, prop) {
    return getSupabase()[prop];
  },
});

/**
 * Supabase Storage API
 * For storing files, images, etc.
 */
export const supabaseStorage = new Proxy({} as any, {
  get(_, prop) {
    return getSupabase().storage[prop];
  },
});

/**
 * Supabase Auth API
 * For authentication operations
 */
export const supabaseAuth = new Proxy({} as any, {
  get(_, prop) {
    return getSupabase().auth[prop];
  },
});
