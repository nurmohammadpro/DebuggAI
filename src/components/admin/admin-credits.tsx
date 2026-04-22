'use client';

import { useMemo, useState } from 'react';
import { Plus, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
      <div className="p-6 max-w-6xl">
        <AdminPageHeader
          title="Credit Management"
          description="View transactions and adjust balances"
          right={
            <Button onClick={() => setAdjustOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adjust Credits
            </Button>
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
    <div className="p-6 max-w-6xl">
      <AdminPageHeader
        title="Credit Management"
        description="View transactions and adjust balances"
        right={
          <Button onClick={() => setAdjustOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adjust Credits
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || 'all')}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="earned">Earned</SelectItem>
              <SelectItem value="spent">Spent</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-green" />
              {summary.earned} earned
            </span>
            <span className="inline-flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-red" />
              {summary.spent} spent
            </span>
          </div>

          <div className="flex-1" />

          <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {txs.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-sm font-semibold">No transactions</div>
          <div className="text-xs text-muted-foreground mt-1">
            Credits activity will appear here.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {txs.map((tx) => (
            <Card key={tx.id} className="hover:bg-muted/10 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">
                        {tx.wallet?.owner?.email || tx.wallet?.owner_id || 'Unknown'}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {tx.source}
                      </Badge>
                      <Badge
                        variant={tx.type === 'earned' ? 'green' : tx.type === 'spent' ? 'red' : 'gray'}
                        className="text-xs"
                      >
                        {tx.type}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {tx.description || 'No description'}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div
                      className={`font-semibold ${
                        tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {tx.amount}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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

