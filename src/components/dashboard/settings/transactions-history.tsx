'use client';

import { useMemo, useState } from 'react';
import { ArrowDownUp, Search, Download, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ReactSelect } from '@/components/ui/react-select';
import { useMyTransactions } from '@/hooks/queries/use-my-transactions';

export function TransactionsHistory() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'earned' | 'spent' | 'refunded'>('all');

  const { data, isLoading, error, refetch } = useMyTransactions(100, true);

  const filtered = useMemo(() => {
    const list = data || [];
    const q = search.trim().toLowerCase();
    return list.filter((t) => {
      const matchesSearch =
        !q ||
        (t.description || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q);
      const matchesType = typeFilter === 'all' || t.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [data, search, typeFilter]);

  const handleExport = () => {
    const csv = [
      ['Date', 'Type', 'Amount', 'Source', 'Description'].join(','),
      ...filtered.map((t) =>
        [
          new Date(t.created_at).toISOString(),
          t.type,
          t.amount,
          t.description || '',
          t.description || '',
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
            <p className="text-sm text-muted-foreground mt-1">
              View and manage your credit transactions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filtered.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div>
        <Card className="mb-6">
          <div className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by source or description..."
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Filter by Type</Label>
                <ReactSelect
                  value={{ value: typeFilter, label: typeFilter === 'all' ? 'All Types' : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1) }}
                  onChange={(opt) => setTypeFilter((opt?.value || 'all') as 'all' | 'earned' | 'spent' | 'refunded')}
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'earned', label: 'Earned' },
                    { value: 'spent', label: 'Spent' },
                    { value: 'refunded', label: 'Refunded' },
                  ]}
                  placeholder="All types"
                />
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="p-6">
            <div className="text-sm font-medium">Failed to load transactions</div>
            <div className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </div>
            <div className="mt-4">
              <Button variant="outline" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </Card>
        )}

        {isLoading && (
          <Card>
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </Card>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <Card>
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <ArrowDownUp className="h-16 w-16 mb-4 opacity-20" />
              {(data || []).length === 0 ? (
                <>
                  <p className="text-lg font-medium mb-2">No transactions yet</p>
                  <p className="text-sm">
                    Your credit transaction history will appear here after you start using DeBuggAI features.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium mb-2">No matching transactions</p>
                  <p className="text-sm">
                    Try adjusting your search or filter to find what you are looking for.
                  </p>
                </>
              )}
            </div>
          </Card>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <Card>
            <ScrollArea className="h-[600px]">
              <div className="divide-y divide-border/40">
                {filtered.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="p-4 flex items-center justify-between hover:bg-muted/30"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            transaction.type === 'earned'
                              ? 'green'
                              : transaction.type === 'spent'
                                ? 'red'
                                : 'gray'
                          }
                          className="text-xs"
                        >
                          {transaction.type}
                        </Badge>
                        <span className="text-sm font-medium">{transaction.description || 'Transaction'}</span>
                      </div>
                      {transaction.description && (
                        <p className="text-sm text-muted-foreground">{transaction.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(transaction.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-semibold ${
                          transaction.amount > 0 ? 'text-[var(--app-success)]' : 'text-[var(--app-danger)]'
                        }`}
                      >
                        {transaction.amount > 0 ? '+' : ''}
                        {transaction.amount === -1 ? 'Unlimited' : transaction.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">credits</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>
    </div>
  );
}

