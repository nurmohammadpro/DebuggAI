/**
 * Email Verification Page
 */

import Link from 'next/link';
import { Mail, CheckCircle2, XCircle } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';

export default function VerifyEmailPage() {
  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-52px)] flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)] text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[10px] bg-[var(--app-accent-soft)] mb-6">
            <Mail className="h-6 w-6" style={{ color: 'var(--app-accent)' }} />
          </div>

          <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)] mb-2">
            Check your email
          </h1>
          <p className="text-[13px] text-[var(--app-text-muted)] mb-6 max-w-[300px] mx-auto">
            We sent a verification link to your email address. Click the link to verify your account.
          </p>

          <div className="space-y-3">
            <div className="flex items-center gap-2 justify-center text-[12px] text-[var(--app-text-muted)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--app-success)]" />
              Check your spam folder
            </div>
            <div className="flex items-center gap-2 justify-center text-[12px] text-[var(--app-text-muted)]">
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--app-success)]" />
              Add noreply@debuggai.com to contacts
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--app-border)]">
            <Link
              href="/login"
              className="text-[13px] text-[var(--app-accent)] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
