import { SignupForm } from '@/components/auth/signup-form';
import { PublicLayout } from '@/components/public-layout';
import Link from 'next/link';

export default function SignupPage() {
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

          <SignupForm />

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
