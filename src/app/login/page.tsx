/**
 * Client Login Page
 */

import Link from 'next/link';
import { PublicLayout } from '@/components/public-layout';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
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

          <LoginForm />

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
