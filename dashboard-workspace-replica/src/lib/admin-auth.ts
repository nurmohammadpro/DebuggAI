/**
 * Admin Authentication Middleware
 *
 * Checks if user has admin privileges before accessing admin routes.
 */

import { supabase } from './supabase';
import { redirect } from 'next/navigation';

/**
 * Verify admin access server-side
 * @returns Promise<{ isAdmin: boolean; userId: string | null }>
 */
export async function verifyAdminAccess() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { isAdmin: false, userId: null };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  return {
    isAdmin: profile?.is_admin ?? false,
    userId: user.id,
  };
}

/**
 * Redirect to login if not authenticated
 */
export async function requireAuth() {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return user;
}

/**
 * Redirect to dashboard if not admin
 */
export async function requireAdmin() {
  const { isAdmin, userId } = await verifyAdminAccess();

  if (!isAdmin) {
    redirect('/dashboard');
  }

  return userId;
}

/**
 * Client-side admin check hook
 */
export function useIsAdmin(): boolean {
  // This will be used with the session store
  return false; // Placeholder, actual implementation in component
}
