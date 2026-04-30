'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ArrowRight, Loader2, ArrowDownUp } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyTransactions } from '@/hooks/queries/use-my-transactions';

export function RecentTransactions() {
  const { data, isLoading, error } = useMyTransactions(5, true);

  return (
    <Card className="p-2.5 sm:p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className="text-xs sm:text-sm font-semibold">Recent Transactions</div>
        <Link href="/dashboard/settings/transactions">
          <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:px-2 text-xs p-0">
            <ArrowRight className="h-3.5 w-3.5" />
            <span className="sr-only">View all</span>
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4 sm:py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-[10px] sm:text-xs text-muted-foreground">
          Failed to load transactions.
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="text-[10px] sm:text-xs text-muted-foreground text-center py-3 sm:py-4">
          No transactions yet.
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-2 rounded-md border border-border/40 p-2 hover:bg-muted/20 transition-colors"
            >
              <ArrowDownUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant={
                      t.type === 'earned' ? 'green' : t.type === 'spent' ? 'red' : 'gray'
                    }
                    className="text-[10px] h-4 sm:h-5 px-1 sm:px-1.5 shrink-0"
                  >
                    {t.type}
                  </Badge>
                </div>
                <div className="text-[10px] sm:text-xs mt-1 text-muted-foreground flex items-center justify-between gap-2">
                  <span className="truncate">{t.source}</span>
                  <span className="shrink-0 tabular-nums text-foreground/90">
                    {t.amount > 0 ? '+' : ''}
                    {t.amount}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

