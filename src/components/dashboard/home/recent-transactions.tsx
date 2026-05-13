'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Loader2, ArrowDownUp } from 'lucide-react';

import { useMyTransactions } from '@/hooks/queries/use-my-transactions';

export function RecentTransactions() {
  const { data, isLoading, error } = useMyTransactions(5, true);

  return (
    <div className="border border-[var(--border-default)]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-default)]">
        <div className="text-xs font-medium text-[var(--text-primary)]">Recent Transactions</div>
        <Link href="/dashboard/settings/transactions">
          <button className="p-1 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--text-tertiary)]" />
        </div>
      )}

      {error && (
        <div className="text-xs text-[var(--text-secondary)] text-center py-4">
          Failed to load transactions.
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="text-xs text-[var(--text-secondary)] text-center py-4">
          No transactions yet.
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="divide-y divide-[var(--border-default)]">
          {data.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-2 p-2.5 hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <ArrowDownUp className="h-3.5 w-3.5 mt-0.5 text-[var(--text-tertiary)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${
                      t.type === 'earned'
                        ? 'bg-green-200 text-green-800'
                        : t.type === 'spent'
                        ? 'bg-red-200 text-red-800'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {t.type}
                  </span>
                </div>
                <div className="text-xs mt-1 text-[var(--text-secondary)] flex items-center justify-between gap-2">
                  <span className="truncate">{t.source}</span>
                  <span className="shrink-0 tabular-nums text-[var(--text-primary)]">
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
