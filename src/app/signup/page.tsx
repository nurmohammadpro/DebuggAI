import { SignUp } from '@clerk/nextjs';
import Link from 'next/link';
import { PublicLayout } from '@/components/public-layout';

export default function SignupPage() {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-52px)] flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
          <div className="mb-6 space-y-1">
            <h1 className="text-2xl font-bold">Create an account</h1>
            <p className="text-sm text-[var(--app-text-muted)]">
              Start with credits for debugging, project generation, and workspace preview.
            </p>
          </div>

          {clerkConfigured ? (
            <SignUp
              routing="path"
              path="/signup"
              signInUrl="/login"
              fallbackRedirectUrl="/dashboard/home"
              forceRedirectUrl="/dashboard/home"
            />
          ) : (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              Clerk is not configured. Set <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and <code>CLERK_SECRET_KEY</code>.
            </div>
          )}

          <div className="mt-4 flex flex-col space-y-4">
            <div className="text-center text-[13px] text-[var(--app-text-muted)]">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--app-accent)] hover:text-[var(--app-text)] transition-colors">
                Sign in
              </Link>
            </div>
            <p className="text-xs text-[var(--app-text-dim)] text-center">
              By signing up, you agree to the Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
