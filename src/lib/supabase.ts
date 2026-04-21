/**
 * Supabase Client Setup
 *
 * Initialized Supabase client with environment variables.
 */

import { createClient } from '@supabase/supabase-js';

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
  ? createClient(supabaseUrl, supabaseAnonKey)
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
