'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { getAppUrl } from '@/lib/app-url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLoading) return;

    const formData = new FormData(e.currentTarget);
    const fullName = String(formData.get('fullName') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    if (!fullName || !email || !password) {
      toast.error('All fields are required');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${getAppUrl()}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      // Check if user was created and if email confirmation is needed
      if (data.user) {
        if (data.user.email_confirmed_at) {
          // Email auto-confirmed (development mode)
          toast.success('Account created successfully!');
          // Redirect to dashboard after a short delay
          setTimeout(() => {
            window.location.href = '/dashboard/home';
          }, 500);
        } else {
          // Email confirmation required
          toast.success('Check your email to confirm your account.');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign up');
      return;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          placeholder="John Doe"
          required
          autoComplete="name"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          required
          autoComplete="email"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="Create a password"
          minLength={8}
          required
          autoComplete="new-password"
        />
        <p className="text-xs text-muted-foreground">
          Must be at least 8 characters
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating…' : 'Create Account'}
      </Button>
    </form>
  );
}
