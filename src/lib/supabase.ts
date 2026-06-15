/**
 * Supabase Client — client-side singleton for database queries and auth.
 *
 * Uses localStorage for session storage (standard supabase-js client).
 * The SSR middleware manages cookies independently for route protection.
 * Logout calls both supabase.auth.signOut() (clears localStorage) and
 * the /api/auth/signout endpoint (clears the SSR cookie).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function fail(name: string): any {
  return new Proxy({} as any, {
    get() { throw new Error(`Supabase ${name} unavailable: env vars missing`); },
  });
}

const _supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : fail('client');

export const supabase = _supabase;
