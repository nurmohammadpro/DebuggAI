/**
 * Transactions History Page
 *
 * View all credit transactions with filtering and export.
 */

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowDownUp, Search, Download, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';

interface Transaction {
  id: string;
  amount: number;
  type: 'earned' | 'spent' | 'refunded';
  source: string;
  description: string | null;
  created_at: string;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'earned' | 'spent' | 'refunded'>('all');

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: wallet } = await supabase
        .from('credit_wallets')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (!wallet) {
        setTransactions([]);
        return;
      }

      const { data } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, source, description, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(100);

      setTransactions((data as Transaction[]) || []);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      !search ||
      t.source.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchesType = typeFilter === 'all' || t.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleExport = () => {
    const csv = [
      ['Date', 'Type', 'Amount', 'Source', 'Description'].join(','),
      ...filteredTransactions.map((t) =>
        [
          new Date(t.created_at).toISOString(),
          t.type,
          t.amount,
          t.source,
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Transaction History</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchTransactions}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filteredTransactions.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Filters */}
        <Card className="mb-6">
          <div className="p-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Search */}
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

              {/* Type Filter */}
              <div className="space-y-2">
                <Label>Filter by Type</Label>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as 'all' | 'earned' | 'spent' | 'refunded')}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="earned">Earned</SelectItem>
                    <SelectItem value="spent">Spent</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Transactions List */}
        {isLoading ? (
          <Card>
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
              <ArrowDownUp className="h-16 w-16 mb-4 opacity-20" />
              {transactions.length === 0 ? (
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
        ) : (
          <Card>
            <ScrollArea className="h-[600px]">
              <div className="divide-y">
                {filteredTransactions.map((transaction) => (
                  <div key={transaction.id} className="p-4 flex items-center justify-between hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={transaction.type === 'earned' ? 'green' : transaction.type === 'spent' ? 'red' : 'gray'}
                          className="text-xs"
                        >
                          {transaction.type}
                        </Badge>
                        <span className="text-sm font-medium">{transaction.source}</span>
                      </div>
                      {transaction.description && (
                        <p className="text-sm text-muted-foreground">{transaction.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-semibold ${
                          transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
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
