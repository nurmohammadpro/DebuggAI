/**
 * Admin Sign-in Action
 *
 * Handles POST requests from the admin login form.
 */

import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/server/auth';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirect') as string || '/admin';

  if (!email || !password) {
    redirect('/admin/login?error=' + encodeURIComponent('Email and password are required'));
  }

  const supabase = await createAdminClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect('/admin/login?error=' + encodeURIComponent(error?.message || 'Invalid credentials'));
  }

  // Check if user is admin
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', data.user.id)
    .maybeSingle();

  console.log('Profile check:', { userId: data.user.id, profile, profileError });

  if (!profile || !profile.is_admin) {
    // Not an admin, sign out and redirect with error
    await supabase.auth.signOut();
    redirect('/admin/login?error=' + encodeURIComponent('Admin access required'));
  }

  // Successful admin login - redirect to admin dashboard or intended page
  redirect(redirectTo);
}
