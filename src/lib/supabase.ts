/**
 * Supabase Client — Clerk handles auth, Supabase is just a database client.
 *
 * Client-side singleton for queries. Server-side routes create their own
 * client via requireUser() which passes the Clerk JWT.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function fail(name: string): any {
  return new Proxy({} as any, {
    get() { throw new Error(`Supabase ${name} unavailable: env vars missing`); },
  });
}

const _supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : fail('client');

export const supabase = _supabase;
