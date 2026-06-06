'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';

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
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast.error(error.message);
          router.replace('/login');
          return;
        }
      }

      router.replace('/dashboard');
    };

    run();
  }, [router, searchParams]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background text-foreground">
      <div className="text-sm text-muted-foreground">Signing you in…</div>
    </div>
  );
}

