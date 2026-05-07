'use client';

import { useMemo, useState } from 'react';
import { Plus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminLoading } from '@/components/admin/admin-loading';
import { AdminError } from '@/components/admin/admin-error';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { AdjustCreditsDialog } from '@/components/admin/adjust-credits-dialog';
import { useAdminCredits } from '@/hooks/queries/use-admin-credits';

export function AdminCredits() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [adjustOpen, setAdjustOpen] = useState(false);

  const { data, isLoading, error, refetch } = useAdminCredits(
    { page, limit: 50, type: typeFilter === 'all' ? null : typeFilter },
    true
  );

  const pages = data?.pagination.pages || 1;
  const txs = data?.transactions || [];

  const summary = useMemo(() => {
    let earned = 0;
    let spent = 0;
    for (const t of txs) {
      if (t.type === 'earned') earned += Math.abs(t.amount);
      if (t.type === 'spent') spent += Math.abs(t.amount);
    }
    return { earned, spent };
  }, [txs]);

  if (isLoading) return <AdminLoading />;

  if (error) {
    return (
      <div>
        <AdminPageHeader
          title="Credit Management"
          description="View transactions and adjust balances"
          right={
            <button
              onClick={() => setAdjustOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--app-accent)] px-3 py-1.5 text-xs font-medium text-black transition-colors hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" />
              Adjust Credits
            </button>
          }
        />
        <AdminError
          title="Failed to load transactions"
          message={error instanceof Error ? error.message : 'Unknown error'}
          onRetry={() => refetch()}
        />
        <AdjustCreditsDialog
          open={adjustOpen}
          onOpenChange={setAdjustOpen}
          onAdjusted={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Credit Management"
        description="View transactions and adjust balances"
        right={
          <button
            onClick={() => setAdjustOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-[8px] bg-[var(--app-accent)] px-3 py-1.5 text-xs font-medium text-black transition-colors hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" />
            Adjust Credits
          </button>
        }
      />

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 rounded-[8px] bg-[var(--app-panel)] p-4 backdrop-blur-xl">
        <div className="flex gap-0.5 rounded-[8px] bg-[var(--app-panel-2)] p-1">
          {(['all', 'earned', 'spent', 'refunded'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`rounded-[6px] px-2.5 py-1.5 text-[11px] font-normal capitalize transition-colors ${
                typeFilter === type
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-[var(--app-success)]">
            <TrendingUp className="h-3.5 w-3.5" />
            {summary.earned} earned
          </span>
          <span className="inline-flex items-center gap-1 text-[var(--app-danger)]">
            <TrendingDown className="h-3.5 w-3.5" />
            {summary.spent} spent
          </span>
        </div>

        <div className="flex-1" />

        <button
          onClick={() => refetch()}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border-0 bg-[var(--app-panel-2)] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
          title="Refresh"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {txs.length === 0 ? (
        <div className="rounded-[8px] bg-[var(--app-panel)] p-10 text-center backdrop-blur-xl">
          <p className="text-sm font-medium text-[var(--app-text)]">No transactions</p>
          <p className="mt-1 text-xs text-[var(--app-text-muted)]">Credits activity will appear here.</p>
        </div>
      ) : (
        <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl overflow-hidden">
          <div className="divide-y divide-[var(--app-border)]">
            {txs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--app-surface-subtle)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-normal text-[var(--app-text)] truncate">
                      {tx.wallet?.profiles?.email || tx.wallet?.user_id || 'Unknown'}
                    </span>
                    <span className="inline-flex rounded-[6px] border border-[var(--app-border)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-text-muted)]">
                      {tx.source}
                    </span>
                    <span className={`inline-flex rounded-[6px] border-0 px-2 py-0.5 text-[11px] font-normal capitalize ${
                      tx.type === 'earned'
                        ? 'bg-[var(--app-success-soft)] text-[var(--app-success)]'
                        : tx.type === 'spent'
                        ? 'bg-[var(--app-danger-soft)] text-[var(--app-danger)]'
                        : 'bg-[var(--app-surface)] text-[var(--app-text-muted)]'
                    }`}>
                      {tx.type}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--app-text-muted)] truncate">
                    {tx.description || 'No description'}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className={`text-sm font-medium ${
                    tx.amount > 0 ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </p>
                  <p className="text-[11px] text-[var(--app-text-dim)]">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AdminPagination
        page={page}
        pages={pages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pages, p + 1))}
      />

      <AdjustCreditsDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        onAdjusted={() => refetch()}
      />
    </div>
  );
}
