'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
      <div className="text-center max-w-md px-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[10px] bg-[var(--app-danger)]/10 mb-6">
          <AlertTriangle className="h-6 w-6 text-[var(--app-danger)]" />
        </div>
        <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)] mb-2">
          Something went wrong
        </h1>
        <p className="text-[13px] text-[var(--app-text-muted)] mb-6">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="text-[11px] font-mono text-[var(--app-text-dim)] mb-4">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 h-9 px-5 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    </div>
  );
}
