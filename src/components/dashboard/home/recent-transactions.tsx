'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Loader2, ArrowDownUp } from 'lucide-react';

import { useMyTransactions } from '@/hooks/queries/use-my-transactions';

export function RecentTransactions() {
  const { data, isLoading, error } = useMyTransactions(5, true);

  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--app-border)]">
        <div className="text-xs font-medium text-[var(--app-text)]">Recent Transactions</div>
        <Link href="/dashboard/settings/transactions" className="inline-flex h-11 w-11 sm:h-8 sm:w-8 items-center justify-center rounded-[6px] text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors touch-manipulation" aria-label="Open transactions">
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--app-text-dim)]" />
        </div>
      )}

      {error && (
        <div className="text-xs text-[var(--app-text-muted)] text-center py-4">
          Failed to load transactions.
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="text-xs text-[var(--app-text-muted)] text-center py-4">
          No transactions yet.
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="divide-y divide-[var(--app-border)]">
          {data.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-2 p-2.5 hover:bg-[var(--app-surface)] transition-colors"
            >
              <ArrowDownUp className="h-3.5 w-3.5 mt-0.5 text-[var(--app-text-dim)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-1.5 py-0.5 rounded-[6px] text-[10px] font-medium shrink-0 ${
                      t.type === 'earned'
                        ? 'bg-[var(--app-success-soft)] text-[var(--app-success)] border border-[var(--app-success)]/20'
                        : t.type === 'spent'
                        ? 'bg-[var(--app-danger-soft)] text-[var(--app-danger)] border border-[var(--app-danger)]/20'
                        : 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border border-[var(--app-border)]'
                    }`}
                  >
                    {t.type}
                  </span>
                </div>
                <div className="text-xs mt-1 text-[var(--app-text-muted)] flex items-center justify-between gap-2">
                  <span className="truncate">{t.source}</span>
                  <span className="shrink-0 tabular-nums text-[var(--app-text)]">
                    {t.amount > 0 ? '+' : ''}
                    {t.amount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
