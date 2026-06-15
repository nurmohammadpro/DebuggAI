/**
 * Supabase Client — client-side singleton for database queries and auth.
 *
 * Uses @supabase/ssr's createBrowserClient so that auth state is stored
 * in cookies (not localStorage). This means signOut() properly clears
 * the session cookie and the middleware won't re-login the user.
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function fail(name: string): any {
  return new Proxy({} as any, {
    get() { throw new Error(`Supabase ${name} unavailable: env vars missing`); },
  });
}

const _supabase = supabaseUrl && supabaseAnonKey
  ? createBrowserClient(supabaseUrl, supabaseAnonKey)
  : fail('client');

export const supabase = _supabase;
