'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Loader2, ArrowDownUp } from 'lucide-react';

import { useMyTransactions } from '@/hooks/queries/use-my-transactions';

export function RecentTransactions() {
  const { data, isLoading, error } = useMyTransactions(5, true);

  return (
    <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[13px] font-medium text-[var(--app-text)]">Recent Transactions</div>
        <Link href="/dashboard/settings/transactions">
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
          Failed to load transactions.
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="text-[13px] text-[var(--app-text-muted)] text-center py-4">
          No transactions yet.
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-2 p-2 rounded-[6px] hover:bg-[var(--app-panel-2)] transition-colors"
            >
              <ArrowDownUp className="h-4 w-4 mt-0.5 text-[var(--app-text-dim)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex rounded-[6px] px-2 py-0.5 text-[11px] font-normal shrink-0 ${
                      t.type === 'earned'
                        ? 'bg-[var(--app-success-soft)] text-[var(--app-success)]'
                        : t.type === 'spent'
                        ? 'bg-[var(--app-danger-soft)] text-[var(--app-danger)]'
                        : 'bg-[var(--app-surface)] text-[var(--app-text-muted)]'
                    }`}
                  >
                    {t.type}
                  </span>
                </div>
                <div className="text-[13px] mt-1 text-[var(--app-text-muted)] flex items-center justify-between gap-2">
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
