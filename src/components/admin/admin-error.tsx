'use client';

import { AlertCircle } from 'lucide-react';

export function AdminError({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[8px] bg-[var(--app-panel)] p-6 backdrop-blur-xl">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--app-danger-soft)] text-[var(--app-danger)]">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--app-text)]">{title}</p>
          {message && (
            <p className="mt-1 text-xs text-[var(--app-text-muted)]">{message}</p>
          )}
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-1.5 text-xs text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
