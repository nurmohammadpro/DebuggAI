/**
 * Supabase Client Setup
 *
 * Initialized Supabase client with environment variables.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
