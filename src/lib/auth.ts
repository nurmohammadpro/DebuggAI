/**
 * Authentication Actions
 *
 * Server actions for authentication using Supabase.
 */

'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export interface AuthResult {
  success: boolean;
  error?: string;
  message?: string;
}

/**
 * Sign up a new user
 */
export async function signUp(formData: FormData): Promise<void> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const fullName = formData.get('fullName') as string;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/', 'layout');
}

/**
 * Sign in existing user
 */
export async function signIn(formData: FormData): Promise<void> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}

/**
 * Send password reset email
 */
export async function resetPassword(formData: FormData): Promise<void> {
  const email = formData.get('email') as string;

  if (!email) {
    throw new Error('Email is required');
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password/confirm`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Update password (after reset)
 */
export async function updatePassword(formData: FormData): Promise<AuthResult> {
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!password || !confirmPassword) {
    return { success: false, error: 'All fields are required' };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match' };
  }

  if (password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters' };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    message: 'Password updated successfully',
  };
}
