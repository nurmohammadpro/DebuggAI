'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bug, ArrowRight, Loader2 } from 'lucide-react';

import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';

export function RecentDebugSessions() {
  const { data, isLoading, error } = useMyDebugSessions(5, true);

  return (
    <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-medium text-[var(--app-text)]">Recent Debug Sessions</div>
        <Link href="/dashboard/debug/history">
          <button className="h-8 w-8 rounded-[6px] inline-flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors">
            <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--app-text-dim)]" />
        </div>
      )}

      {error && (
        <div className="text-[13px] text-[var(--app-text-muted)]">
          Failed to load sessions.
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="text-[13px] text-[var(--app-text-muted)] text-center py-4">
          No sessions yet.
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((s) => (
            <div
              key={s.id}
              className="flex items-start gap-2 p-2 rounded-[6px] hover:bg-[var(--app-panel-2)] transition-colors"
            >
              <Bug className="h-4 w-4 mt-0.5 text-[var(--app-text-dim)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex rounded-[6px] bg-[var(--app-surface)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-text-muted)] shrink-0">
                    {s.language}
                  </span>
                </div>
                <div className="text-[13px] mt-1 text-[var(--app-text-muted)] line-clamp-2">
                  {s.error_message || s.code}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
