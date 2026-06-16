'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';

function getSafeRedirectPath(searchParams: URLSearchParams) {
  const redirect = searchParams.get('redirect');
  if (redirect?.startsWith('/dashboard')) {
    return redirect;
  }
  return '/dashboard/home';
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const run = async () => {
      const code = searchParams.get('code');
      const errorDescription = searchParams.get('error_description');

      if (errorDescription) {
        toast.error(decodeURIComponent(errorDescription));
        router.replace('/login');
        return;
      }

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error(error.message);
          router.replace('/login');
          return;
        }

        // Sync the session to an SSR cookie so the middleware can see it.
        if (data.session) {
          await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            }),
          });
        }
      }

      router.replace(getSafeRedirectPath(searchParams));
      router.refresh();
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground">
      <div className="text-sm text-muted-foreground">Signing you in…</div>
    </div>
  );
}
