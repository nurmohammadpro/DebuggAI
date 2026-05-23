'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bug, ArrowRight, Loader2 } from 'lucide-react';

import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';

export function RecentDebugSessions() {
  const { data, isLoading, error } = useMyDebugSessions(5, true);

  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--app-border)]">
        <div className="text-xs font-medium text-[var(--app-text)]">Recent Debug Sessions</div>
        <Link href="/dashboard/debug/history">
          <button className="p-1 rounded-[6px] text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors">
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
          Failed to load sessions.
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="text-xs text-[var(--app-text-muted)] text-center py-4">
          No sessions yet.
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="divide-y divide-[var(--app-border)]">
          {data.map((s) => (
            <div
              key={s.id}
              className="flex items-start gap-2 p-2.5 hover:bg-[var(--app-surface)] transition-colors"
            >
              <Bug className="h-3.5 w-3.5 mt-0.5 text-[var(--app-text-dim)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 rounded-[6px] bg-[var(--app-surface)] text-[10px] font-medium text-[var(--app-text-muted)] shrink-0">
                    {s.language}
                  </span>
                </div>
                <div className="text-xs mt-1 text-[var(--app-text-muted)] line-clamp-1">
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
