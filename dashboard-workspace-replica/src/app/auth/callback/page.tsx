import { Suspense } from 'react';
import { AuthCallbackClient } from '@/components/auth/auth-callback-client';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-sm text-muted-foreground">Signing you in…</div>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}

