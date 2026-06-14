import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PublicLayout } from '@/components/public-layout';

export default async function LoginPage() {
  const { userId } = await auth();
  if (userId) redirect('/dashboard/home');

  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-52px)] flex items-center justify-center p-4">
        <div
          className="w-full max-w-md p-6 rounded-[6px] border border-[var(--app-border)]"
          style={{ background: 'var(--app-panel)' }}
        >
          <div className="mb-6">
            <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
              Sign in
            </h1>
            <p className="text-[13px] text-[var(--app-text-muted)] mt-1">
              Continue to your projects, debug sessions, credits, and workspace history.
            </p>
          </div>

          {clerkConfigured ? (
            <SignIn
              routing="path"
              path="/login"
              signUpUrl="/signup"
              fallbackRedirectUrl="/dashboard/home"
              forceRedirectUrl="/dashboard/home"
            />
          ) : (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Clerk is not configured. Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and <code>CLERK_SECRET_KEY</code>.
            </div>
          )}

          <p className="text-[13px] text-[var(--app-text-muted)] text-center mt-4">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-[var(--app-accent)] hover:text-[var(--app-text)] transition-colors">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
