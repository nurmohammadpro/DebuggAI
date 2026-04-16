/**
 * Admin Credits Management Page
 *
 * View all credit transactions and manually adjust user balances.
 */

'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Minus,
  Loader2,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Transaction {
  id: string;
  wallet_id: string;
  amount: number;
  type: 'earned' | 'spent' | 'refunded';
  source: string;
  description: string | null;
  created_at: string;
  wallet: {
    owner_id: string;
    owner: {
      email: string;
      full_name: string | null;
    };
  };
}

export default function AdminCreditsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useSessionStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Adjust credits modal state
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustEmail, setAdjustEmail] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('10');
  const [adjustDescription, setAdjustDescription] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (!user?.isAdmin) {
        router.push('/dashboard');
      } else {
        fetchTransactions();
      }
    }
  }, [isAuthenticated, isLoading, user, router, currentPage, typeFilter]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '50',
        ...(typeFilter !== 'all' && { type: typeFilter }),
      });

      const response = await fetch(`/api/admin/credits?${params}`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
        setTotalPages(data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustCredits = async () => {
    if (!adjustEmail || !adjustAmount || !adjustDescription) {
      alert('Please fill in all fields');
      return;
    }

    try {
      setAdjusting(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First, find the user by email
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', adjustEmail)
        .single();

      if (!profiles) {
        alert('User not found with that email');
        setAdjusting(false);
        return;
      }

      const amount = parseInt(adjustAmount);
      const response = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: profiles.id,
          amount,
          description: adjustDescription,
        }),
      });

      if (response.ok) {
        await fetchTransactions();
        setAdjustModalOpen(false);
        setAdjustEmail('');
        setAdjustAmount('10');
        setAdjustDescription('');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to adjust credits');
      }
    } catch (error) {
      console.error('Failed to adjust credits:', error);
    } finally {
      setAdjusting(false);
    }
  };

  if (isLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Credit Management</h1>
            <p className="text-muted-foreground mt-1">
              View transactions and adjust balances
            </p>
          </div>
        </div>

        <Button onClick={() => setAdjustModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adjust Credits
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="earned">Earned</SelectItem>
                <SelectItem value="spent">Spent</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={fetchTransactions}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <div className="space-y-3">
        {transactions.map((tx) => (
          <Card key={tx.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div
                    className={`p-2 rounded-lg ${
                      tx.type === 'earned'
                        ? 'bg-green-100 dark:bg-green-900'
                        : tx.type === 'spent'
                        ? 'bg-red-100 dark:bg-red-900'
                        : 'bg-yellow-100 dark:bg-yellow-900'
                    }`}
                  >
                    {tx.type === 'earned' ? (
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : tx.type === 'spent' ? (
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <RefreshCw className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{tx.wallet.owner.email}</span>
                      <Badge variant="outline" className="text-xs">
                        {tx.source}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {tx.description || 'No description'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span
                    className={`font-semibold ${
                      tx.amount > 0
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount}
                  </span>
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {new Date(tx.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Adjust Credits Modal */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust User Credits</DialogTitle>
            <DialogDescription>
              Manually add or remove credits from a user&apos;s wallet
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="email">User Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={adjustEmail}
                onChange={(e) => setAdjustEmail(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="amount">Amount</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setAdjustAmount((prev) => String(Math.abs(parseInt(prev)) * -1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="amount"
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setAdjustAmount((prev) => String(Math.abs(parseInt(prev))))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Positive to add credits, negative to remove
              </p>
            </div>

            <div>
              <Label htmlFor="description">Reason</Label>
              <Textarea
                id="description"
                placeholder="e.g., Refund for service interruption"
                value={adjustDescription}
                onChange={(e) => setAdjustDescription(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAdjustCredits} disabled={adjusting}>
              {adjusting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Adjust Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
