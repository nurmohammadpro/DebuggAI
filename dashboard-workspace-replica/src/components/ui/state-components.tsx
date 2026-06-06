import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileWarning, Search, Frown } from 'lucide-react';

// ── Page Loading ──

export function PageLoading({
  className,
  message = 'Loading...',
}: {
  className?: string;
  message?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-full min-h-[300px] gap-4', className)}>
      <Loader2 className="h-8 w-8 animate-spin text-[var(--app-accent)]/60" />
      <p className="text-[13px] text-[var(--app-text-muted)]">{message}</p>
    </div>
  );
}

// ── Page Empty ──

export function PageEmpty({
  icon: Icon = Search,
  title = 'Nothing here yet',
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center h-full min-h-[300px] gap-3 px-6 text-center', className)}>
      <div className="w-12 h-12 rounded-[12px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center mb-2">
        <Icon className="h-5 w-5 text-[var(--app-text-dim)]" />
      </div>
      <h3 className="text-[14px] font-medium text-[var(--app-text)]">{title}</h3>
      {description && (
        <p className="text-[12px] text-[var(--app-text-muted)] max-w-[320px] leading-relaxed">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// ── Page Error ──

export function PageError({
  error,
  onRetry,
  className,
}: {
  error?: Error | string | null;
  onRetry?: () => void;
  className?: string;
}) {
  const message =
    typeof error === 'string'
      ? error
      : error?.message || 'An unexpected error occurred';

  return (
    <div className={cn('flex flex-col items-center justify-center h-full min-h-[300px] gap-3 px-6 text-center', className)}>
      <div className="w-12 h-12 rounded-[12px] bg-red-50 border border-red-200 flex items-center justify-center mb-2">
        <FileWarning className="h-5 w-5 text-red-500" />
      </div>
      <h3 className="text-[14px] font-medium text-[var(--app-text)]">Something went wrong</h3>
      <p className="text-[12px] text-[var(--app-text-muted)] max-w-[360px] leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 h-8 px-4 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[11px] font-semibold hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// ── Inline Empty ──

export function InlineEmpty({
  message = 'No data',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-center py-8', className)}>
      <div className="flex items-center gap-2">
        <Frown className="h-4 w-4 text-[var(--app-text-dim)]" />
        <span className="text-[12px] text-[var(--app-text-muted)]">{message}</span>
      </div>
    </div>
  );
}
