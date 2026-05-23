'use client';

import Link from 'next/link';
import { formatDistanceToNowStrict } from 'date-fns';
import { ArrowRight, Loader2 } from 'lucide-react';

import { useMyRuns } from '@/hooks/queries/use-my-runs';

function tone(status: string) {
  if (status === 'succeeded') return 'bg-[var(--app-success-soft)] text-[var(--app-success)] border border-[var(--app-success)]/20';
  if (status === 'failed') return 'bg-[var(--app-danger-soft)] text-[var(--app-danger)] border border-[var(--app-danger)]/20';
  if (status === 'running') return 'bg-[var(--app-info-soft)] text-[var(--app-info)] border border-[var(--app-info)]/20';
  if (status === 'queued') return 'bg-[var(--app-warning-soft)] text-[var(--app-warning)] border border-[var(--app-warning)]/20';
  return 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border border-[var(--app-border)]';
}

export function RecentRuns() {
  const { data, isLoading, error } = useMyRuns(6, true);

  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--app-border)]">
        <div className="text-xs font-medium text-[var(--app-text)]">Recent Runs</div>
        <Link href="/dashboard">
          <button
            className="p-1 rounded-[6px] text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            title="Open workspace"
            aria-label="Open workspace"
          >
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--app-text-dim)]" />
        </div>
      )}

      {error && (
        <div className="text-xs text-[var(--app-text-muted)] text-center py-4">
          Failed to load runs.
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="text-xs text-[var(--app-text-muted)] text-center py-4">
          No runs yet.
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="divide-y divide-[var(--app-border)]">
          {data.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/runs/${r.id}`}
              className="block p-2.5 hover:bg-[var(--app-surface)] transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-[var(--app-text)] line-clamp-1">
                    {(r.objective || '').trim() || 'Run'}
                  </div>
                  <div className="text-[11px] text-[var(--app-text-dim)] mt-0.5">
                    {formatDistanceToNowStrict(new Date(r.created_at), { addSuffix: true })}
                  </div>
                </div>
                <span className={`shrink-0 rounded-[999px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${tone(r.status)}`}>
                  {r.status}
                </span>
              </div>
              {r.error && (
                <div className="mt-2 text-[11px] text-[var(--app-danger)] line-clamp-1">
                  {r.error}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
