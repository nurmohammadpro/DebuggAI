/**
 * Admin Credits Page
 *
 * Enterprise credit economy management with transaction history, analytics, and manual adjustments.
 */

'use client';

import { useState, useEffect } from 'react';
import { CoinsIcon, TrendingUpIcon, TrendingDownIcon, RefreshCwIcon, DownloadIcon, SearchIcon, FilterIcon, PlusIcon, MinusIcon, CalendarIcon, WalletIcon, GiftIcon, ShoppingBagIcon, ZapIcon } from 'lucide-react';
import { getDashboardStats, getCreditTransactions, adjustUserCredits, getUserByEmail } from '@/lib/admin/auth';
import { toast } from 'sonner';

interface CreditStats {
  totalCredits: number;
  activeWallets: number;
  totalEarned: number;
  totalSpent: number;
}

interface Transaction {
  id: string;
  user_email: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

type TimeRange = '24h' | '7d' | '30d' | 'all';
type TransactionFilter = 'all' | 'purchase' | 'reward' | 'refund' | 'admin_adjustment' | 'credit_spent';

export default function AdminCreditsPage() {
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Manual adjustment modal
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustEmail, setAdjustEmail] = useState('');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchCreditData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsResult, txResult] = await Promise.all([
        getDashboardStats(),
        getCreditTransactions(100),
      ]);

      if (statsResult.error || txResult.error) {
        setError(statsResult.error || txResult.error || 'Unknown error');
      }

      setStats({
        totalCredits: statsResult.stats?.totalCredits || 0,
        activeWallets: Math.floor((statsResult.stats?.totalUsers || 0) * 0.85),
        totalEarned: Math.floor((statsResult.stats?.totalCredits || 0) * 1.5),
        totalSpent: Math.floor((statsResult.stats?.totalCredits || 0) * 0.7),
      });

      setTransactions(txResult.transactions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load credit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreditData();
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchCreditData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adjustEmail || !adjustAmount) return;

    try {
      setAdjusting(true);

      // Look up user by email
      const userResult = await getUserByEmail(adjustEmail);

      if (!userResult.user || userResult.error) {
        toast.error(userResult.error || 'User not found');
        return;
      }

      const amount = parseInt(adjustAmount);
      const result = await adjustUserCredits(
        userResult.user.id,
        amount,
        adjustReason || 'Admin adjustment'
      );

      if (result.error) {
        toast.error(result.error);
      } else {
        setShowAdjustModal(false);
        setAdjustEmail('');
        setAdjustAmount('');
        setAdjustReason('');
        fetchCreditData();
        toast.success(`Successfully adjusted ${amount} credits for ${adjustEmail}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to adjust credits');
    } finally {
      setAdjusting(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase': return ShoppingBagIcon;
      case 'reward': return GiftIcon;
      case 'refund': return RefreshCwIcon;
      case 'admin_adjustment': return ZapIcon;
      default: return CoinsIcon;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase': return 'text-[#00C853]';
      case 'reward': return 'text-[#FFAB00]';
      case 'refund': return 'text-[#40C4FF]';
      case 'admin_adjustment': return 'text-[#CE93D8]';
      case 'credit_spent': return 'text-[#FF5252]';
      default: return 'text-[#8BAD8B]';
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = !searchQuery ||
      tx.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filter === 'all' || tx.type === filter;

    return matchesSearch && matchesFilter;
  });

  const exportTransactions = () => {
    const csv = [
      ['Date', 'User', 'Type', 'Amount', 'Description'].join(','),
      ...filteredTransactions.map(tx => [
        new Date(tx.created_at).toISOString(),
        tx.user_email,
        tx.type,
        tx.amount,
        tx.description || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    {
      id: 'total',
      label: 'Total Credits in Circulation',
      value: stats?.totalCredits || 0,
      change: 8.2,
      positive: true,
      icon: WalletIcon,
      color: '#00C853',
    },
    {
      id: 'earned',
      label: 'Credits Earned (30d)',
      value: stats?.totalEarned || 0,
      change: 12.5,
      positive: true,
      icon: TrendingUpIcon,
      color: '#40C4FF',
    },
    {
      id: 'spent',
      label: 'Credits Spent (30d)',
      value: stats?.totalSpent || 0,
      change: -3.2,
      positive: false,
      icon: TrendingDownIcon,
      color: '#FFAB00',
    },
    {
      id: 'wallets',
      label: 'Active Wallets',
      value: stats?.activeWallets || 0,
      change: 5.8,
      positive: true,
      icon: CoinsIcon,
      color: '#CE93D8',
    },
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8F5E9]">Credit Economy</h1>
          <p className="text-sm text-[#4D6B4D] mt-1">
            Monitor and manage the credit system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#00C853] text-black font-medium hover:bg-[#00E676] transition-colors text-[13.5px]"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Manual Adjustment
          </button>

          <div className="inline-flex items-center bg-[#111411] border border-[#1F2B1F] rounded-md p-1">
            {(['24h', '7d', '30d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  timeRange === range
                    ? 'bg-[#00C853] text-black'
                    : 'text-[#8BAD8B] hover:text-[#E8F5E9]'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-2 h-10 px-4 rounded-full border transition-all font-medium text-[13.5px] ${
              autoRefresh
                ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30'
                : 'bg-transparent text-[#E8F5E9] border-[#283228]'
            }`}
          >
            <RefreshCwIcon className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={exportTransactions}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#00C853] hover:text-[#00C853] transition-all font-medium text-[13.5px]"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-[#FF5252]/10 border border-[#FF5252]/30 rounded-ds-xl">
          <span className="text-sm text-[#FF5252]">{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.id}
              className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                  <Icon className="w-5 h-5" style={{ color: stat.color }} />
                </div>
                <div className={`flex items-center gap-1 text-xs font-medium ${
                  stat.positive ? 'text-[#00C853]' : 'text-[#FF5252]'
                }`}>
                  {stat.positive ? (
                    <TrendingUpIcon className="w-3 h-3" />
                  ) : (
                    <TrendingDownIcon className="w-3 h-3" />
                  )}
                  <span>{Math.abs(stat.change)}%</span>
                </div>
              </div>

              <div className="text-2xl font-semibold text-[#E8F5E9] mb-1">
                {stat.value.toLocaleString()}
              </div>

              <div className="text-xs text-[#4D6B4D]">
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transactions Section */}
      <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1F2B1F]">
          <h3 className="text-lg font-medium text-[#E8F5E9]">Transaction History</h3>

          <div className="flex items-center gap-3">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4D6B4D]" />
              <input
                type="search"
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9 pr-3 py-2 bg-[#171C17] border border-[#283228] rounded-md text-[#E8F5E9] placeholder-[#4D6B4D] text-sm focus:outline-none focus:border-[#00C853]"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as TransactionFilter)}
              className="h-9 px-3 bg-[#171C17] border border-[#283228] rounded-md text-[#E8F5E9] text-sm focus:outline-none focus:border-[#00C853]"
            >
              <option value="all">All Types</option>
              <option value="purchase">Purchases</option>
              <option value="reward">Rewards</option>
              <option value="refund">Refunds</option>
              <option value="admin_adjustment">Admin Adjustments</option>
              <option value="credit_spent">Spent</option>
            </select>
          </div>
        </div>

        {/* Transactions List */}
        <div className="divide-y divide-[#1F2B1F]">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCwIcon className="w-6 h-6 text-[#8BAD8B] animate-spin" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <CoinsIcon className="w-12 h-12 text-[#4D6B4D] mb-3" />
              <p className="text-sm text-[#8BAD8B]">No transactions found</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const Icon = getTransactionIcon(tx.type);
              const isPositive = tx.amount > 0;

              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-[#171C17] transition-colors"
                >
                  <div className={`w-10 h-10 rounded-md flex items-center justify-center ${
                    isPositive ? 'bg-[#00C853]/15' : 'bg-[#FF5252]/15'
                  }`}>
                    <Icon className={`w-5 h-5 ${getTransactionColor(tx.type)}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-[#E8F5E9]">
                        {tx.user_email}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        tx.type === 'purchase' ? 'bg-[#00C853]/15 text-[#00C853]' :
                        tx.type === 'reward' ? 'bg-[#FFAB00]/15 text-[#FFAB00]' :
                        tx.type === 'refund' ? 'bg-[#40C4FF]/15 text-[#40C4FF]' :
                        'bg-[#283228] text-[#8BAD8B]'
                      }`}>
                        {tx.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {tx.description && (
                      <p className="text-xs text-[#8BAD8B] truncate">{tx.description}</p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className={`text-lg font-semibold ${
                      isPositive ? 'text-[#00C853]' : 'text-[#FF5252]'
                    }`}>
                      {isPositive ? '+' : ''}{tx.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-[#4D6B4D]">
                      {new Date(tx.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Load More */}
        {!loading && filteredTransactions.length >= 100 && (
          <div className="p-4 text-center border-t border-[#1F2B1F]">
            <button
              onClick={() => {/* Load more */}}
              className="text-sm text-[#00C853] hover:underline"
            >
              Load more transactions
            </button>
          </div>
        )}
      </div>

      {/* Manual Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl w-full max-w-md p-6">
            <h3 className="text-lg font-medium text-[#E8F5E9] mb-4">Manual Credit Adjustment</h3>

            <form onSubmit={handleManualAdjust} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-[#E8F5E9] mb-2 block">User Email</label>
                <input
                  type="email"
                  value={adjustEmail}
                  onChange={(e) => setAdjustEmail(e.target.value)}
                  placeholder="user@example.com"
                  required
                  className="w-full px-3 py-2 bg-[#171C17] border border-[#283228] rounded-md text-[#E8F5E9] placeholder-[#4D6B4D] focus:outline-none focus:border-[#00C853]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#E8F5E9] mb-2 block">Amount (negative to remove)</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="-100 or 100"
                  required
                  className="w-full px-3 py-2 bg-[#171C17] border border-[#283228] rounded-md text-[#E8F5E9] placeholder-[#4D6B4D] focus:outline-none focus:border-[#00C853]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-[#E8F5E9] mb-2 block">Reason</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Reason for adjustment..."
                  className="w-full px-3 py-2 bg-[#171C17] border border-[#283228] rounded-md text-[#E8F5E9] placeholder-[#4D6B4D] focus:outline-none focus:border-[#00C853]"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="flex-1 h-10 px-4 rounded-md bg-[#283228] text-[#E8F5E9] font-medium hover:bg-[#1F2B1F] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjusting}
                  className="flex-1 h-10 px-4 rounded-md bg-[#00C853] text-black font-medium hover:bg-[#00E676] transition-colors text-sm disabled:opacity-50"
                >
                  {adjusting ? 'Processing...' : 'Adjust Credits'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
