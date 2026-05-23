'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Search, RefreshCw } from 'lucide-react';

import { useMyRuns } from '@/hooks/queries/use-my-runs';

function tone(status: string) {
  if (status === 'succeeded') return 'bg-[var(--app-success-soft)] text-[var(--app-success)] border border-[var(--app-success)]/20';
  if (status === 'failed') return 'bg-[var(--app-danger-soft)] text-[var(--app-danger)] border border-[var(--app-danger)]/20';
  if (status === 'running') return 'bg-[var(--app-info-soft)] text-[var(--app-info)] border border-[var(--app-info)]/20';
  if (status === 'queued') return 'bg-[var(--app-warning-soft)] text-[var(--app-warning)] border border-[var(--app-warning)]/20';
  return 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border border-[var(--app-border)]';
}

export function RunsList() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | string>('all');
  const { data, isLoading, error, refetch } = useMyRuns(50, true);

  const filtered = useMemo(() => {
    const list = data || [];
    const needle = q.trim().toLowerCase();
    return list.filter((r) => {
      const okStatus = status === 'all' ? true : r.status === status;
      if (!okStatus) return false;
      if (!needle) return true;
      return ((r.objective || '') + ' ' + (r.error || '')).toLowerCase().includes(needle);
    });
  }, [data, q, status]);

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--app-text)]">Runs</div>
          <div className="text-xs text-[var(--app-text-muted)] mt-1">
            Execution history for builds, exports, and agent work.
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] hover:bg-[var(--app-surface)] transition-colors text-[12px] font-medium text-[var(--app-text)]"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-text-dim)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search objective or error..."
              className="h-9 w-full pl-10 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 text-[13px] text-[var(--app-text)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20"
          >
            <option value="all">All statuses</option>
            <option value="queued">Queued</option>
            <option value="running">Running</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
          <div className="text-sm font-medium text-[var(--app-text)]">Failed to load runs</div>
          <div className="text-xs text-[var(--app-text-muted)] mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-[12px] text-[var(--app-text-muted)]">
          Loading runs…
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-center">
          <div className="text-sm font-medium text-[var(--app-text)]">No runs</div>
          <div className="text-xs text-[var(--app-text-muted)] mt-1">
            Runs will appear here once you start generating or exporting.
          </div>
        </div>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
          <div className="divide-y divide-[var(--app-border)]">
            {filtered.map((r) => (
              <Link
                key={r.id}
                href={`/dashboard/runs/${r.id}`}
                className="block px-4 py-3 hover:bg-[var(--app-surface)] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-[var(--app-text)] line-clamp-1">
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
        </div>
      )}
    </div>
  );
}

