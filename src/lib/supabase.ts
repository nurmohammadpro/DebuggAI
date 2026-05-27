/**
 * Supabase Client Setup
 *
 * Uses @supabase/ssr for cookie-based session management to avoid
 * localStorage lock contention (the "lock was not released" error).
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

export const supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) {
          const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
          return match?.[1];
        },
        set(name, value, options) {
          document.cookie = `${name}=${value}; Path=/; SameSite=Lax; Max-Age=${options?.maxAge ?? 3600}`;
        },
        remove(name) {
          document.cookie = `${name}=; Path=/; SameSite=Lax; Max-Age=0`;
        },
      },
    })
  : createMissingEnvProxy();

/**
 * Supabase Storage API
 * For storing files, images, etc.
 */
export const supabaseStorage = supabase.storage;

/**
 * Supabase Auth API
 * For authentication operations
 */
export const supabaseAuth = supabase.auth;
