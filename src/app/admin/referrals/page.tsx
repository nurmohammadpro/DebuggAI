/**
 * Admin Referrals Page
 *
 * Enterprise referral tracking with real database data.
 */

'use client';

import { useState, useEffect } from 'react';
import { TrophyIcon, MedalIcon, AwardIcon, UsersIcon, CoinsIcon, RefreshCwIcon, DownloadIcon } from 'lucide-react';
import { getReferralStats } from '@/lib/admin/auth';

interface Ambassador {
  id: string;
  email: string;
  full_name: string | null;
  referral_count: number;
  total_earned: number;
  tier: 'bronze' | 'silver' | 'gold';
}

type TimeRange = '7d' | '30d' | '90d' | 'all';

export default function AdminReferralsPage() {
  const [ambassadors, setAmbassadors] = useState<Ambassador[]>([]);
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalPayouts, setTotalPayouts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getReferralStats(100);

      if (result.error) {
        setError(result.error);
      } else {
        setAmbassadors(result.ambassadors);
        setTotalReferrals(result.total_referrals);
        setTotalPayouts(result.total_payouts);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralData();
  }, [timeRange]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchReferralData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, timeRange]);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'gold':
        return (
          <div className="flex items-center gap-1 text-xs font-medium text-[#FFD700]">
            <TrophyIcon className="w-3.5 h-3.5" />
            Gold
          </div>
        );
      case 'silver':
        return (
          <div className="flex items-center gap-1 text-xs font-medium text-[#C0C0C0]">
            <MedalIcon className="w-3.5 h-3.5" />
            Silver
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-xs font-medium text-[#CD7F32]">
            <AwardIcon className="w-3.5 h-3.5" />
            Bronze
          </div>
        );
    }
  };

  const getTierBackground = (tier: string) => {
    switch (tier) {
      case 'gold': return 'bg-[#FFD700]/15 border-[#FFD700]/30';
      case 'silver': return 'bg-[#C0C0C0]/15 border-[#C0C0C0]/30';
      default: return 'bg-[#CD7F32]/15 border-[#CD7F32]/30';
    }
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n?.[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const exportReferrals = () => {
    const csv = [
      ['Rank', 'Name', 'Email', 'Referrals', 'Earned', 'Tier'].join(','),
      ...ambassadors.map((a, i) => [
        i + 1,
        a.full_name || 'Anonymous',
        a.email,
        a.referral_count,
        a.total_earned,
        a.tier,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `referrals-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <TrophyIcon className="w-4 h-4 text-yellow-500" />;
    if (index === 1) return <MedalIcon className="w-4 h-4 text-gray-400" />;
    if (index === 2) return <AwardIcon className="w-4 h-4 text-orange-600" />;
    return <span className="text-xs text-gray-500">#{index + 1}</span>;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8F5E9]">Referrals & Ambassadors</h1>
          <p className="text-sm text-[#4D6B4D] mt-1">
            Track referral performance and ambassador rewards
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center bg-[#111411] border border-[#1F2B1F] rounded-[8px] p-1">
            {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all ${
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
            onClick={exportReferrals}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#00C853] hover:text-[#00C853] transition-all font-medium text-[13.5px]"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Export
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-[#FF5252]/10 border border-[#FF5252]/30 rounded-[8px]-xl">
          <span className="text-sm text-[#FF5252]">{error}</span>
          <button
            onClick={fetchReferralData}
            className="px-3 py-1.5 text-xs font-medium rounded-[8px] bg-[#FF5252] text-black hover:bg-[#FF7B7B] transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111411] border border-[#1F2B1F] rounded-[8px]-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#00C853]/15 border border-[#00C853]/30 flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-[#00C853]" />
            </div>
            <span className="text-xs uppercase tracking-wider text-[#4D6B4D]">Total Referrals</span>
          </div>
          <div className="text-3xl font-semibold text-[#E8F5E9]">
            {totalReferrals.toLocaleString()}
          </div>
          <p className="text-xs text-[#8BAD8B] mt-1">All time</p>
        </div>

        <div className="bg-[#111411] border border-[#1F2B1F] rounded-[8px]-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#FFAB00]/15 border border-[#FFAB00]/30 flex items-center justify-center">
              <CoinsIcon className="w-5 h-5 text-[#FFAB00]" />
            </div>
            <span className="text-xs uppercase tracking-wider text-[#4D6B4D]">Total Payouts</span>
          </div>
          <div className="text-3xl font-semibold text-[#E8F5E9]">
            {totalPayouts.toLocaleString()}
          </div>
          <p className="text-xs text-[#8BAD8B] mt-1">Credits awarded</p>
        </div>

        <div className="bg-[#111411] border border-[#1F2B1F] rounded-[8px]-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#CE93D8]/15 border border-[#CE93D8]/30 flex items-center justify-center">
              <TrophyIcon className="w-5 h-5 text-[#CE93D8]" />
            </div>
            <span className="text-xs uppercase tracking-wider text-[#4D6B4D]">Active Ambassadors</span>
          </div>
          <div className="text-3xl font-semibold text-[#E8F5E9]">
            {ambassadors.filter(a => a.referral_count > 0).length}
          </div>
          <p className="text-xs text-[#8BAD8B] mt-1">With referrals</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leaderboard */}
        <div className="lg:col-span-2 bg-[#111411] border border-[#1F2B1F] rounded-[8px]-xl">
          <div className="p-5 border-b border-[#1F2B1F]">
            <h3 className="text-lg font-medium text-[#E8F5E9]">Ambassador Leaderboard</h3>
            <p className="text-xs text-[#8BAD8B] mt-1">Top performers ranked by referral count</p>
          </div>

          <div className="divide-y divide-[#1F2B1F]">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCwIcon className="w-6 h-6 text-[#8BAD8B] animate-spin" />
              </div>
            ) : ambassadors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <UsersIcon className="w-12 h-12 text-[#4D6B4D] mb-3" />
                <p className="text-sm text-[#8BAD8B]">No ambassadors yet</p>
                <p className="text-xs text-[#4D6B4D] mt-1">Ambassadors will appear here when users start referring others</p>
              </div>
            ) : (
              ambassadors.map((ambassador, index) => (
                <div
                  key={ambassador.id}
                  className="flex items-center gap-4 p-4 hover:bg-[#171C17] transition-colors"
                >
                  <span className="font-mono text-lg w-12 text-center">
                    {getRankBadge(index)}
                  </span>

                  <div className="w-10 h-10 rounded-full bg-[#1E261E] flex items-center justify-center text-[#8BAD8B] text-xs font-semibold flex-shrink-0 border border-[#1F2B1F]">
                    {getInitials(ambassador.full_name, ambassador.email)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#E8F5E9] truncate">
                      {ambassador.full_name || 'Anonymous User'}
                    </p>
                    <p className="text-xs text-[#8BAD8B] truncate">{ambassador.email}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#E8F5E9]">{ambassador.referral_count}</p>
                      <p className="text-xs text-[#4D6B4D]">referrals</p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-[#00C853]">{ambassador.total_earned}</p>
                      <p className="text-xs text-[#4D6B4D]">earned</p>
                    </div>

                    <div className={`px-3 py-1 rounded-[8px] border ${getTierBackground(ambassador.tier)}`}>
                      {getTierBadge(ambassador.tier)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tier Breakdown */}
        <div className="bg-[#111411] border border-[#1F2B1F] rounded-[8px]-xl p-5">
          <h3 className="text-lg font-medium text-[#E8F5E9] mb-4">Tier Breakdown</h3>

          <div className="space-y-4">
            {[
              { tier: 'Gold', min: 50, count: ambassadors.filter(a => a.tier === 'gold').length, color: '#FFD700' },
              { tier: 'Silver', min: 25, count: ambassadors.filter(a => a.tier === 'silver').length, color: '#C0C0C0' },
              { tier: 'Bronze', min: 1, count: ambassadors.filter(a => a.tier === 'bronze').length, color: '#CD7F32' },
            ].map((tier) => (
              <div key={tier.tier} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tier.color }}
                    />
                    <span className="text-sm text-[#E8F5E9]">{tier.tier}</span>
                  </div>
                  <span className="text-sm font-medium text-[#E8F5E9]">{tier.count} ambassadors</span>
                </div>
                <div className="h-2 bg-[#1E261E] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${ambassadors.length > 0 ? (tier.count / ambassadors.length) * 100 : 0}%`,
                      backgroundColor: tier.color,
                    }}
                  />
                </div>
                <p className="text-xs text-[#4D6B4D]">
                  {tier.min}+ referrals required
                </p>
              </div>
            ))}
          </div>

          {/* Referral Program Info */}
          <div className="mt-6 p-4 bg-[#00C853]/5 border border-[#00C853]/30 rounded-[8px]-xl">
            <h4 className="text-sm font-medium text-[#00C853] mb-2">Program Details</h4>
            <ul className="space-y-1 text-xs text-[#8BAD8B]">
              <li>• 10 credits per successful referral</li>
              <li>• Both referrer and referee get bonus</li>
              <li>• Tier rewards at 25+ and 50+ referrals</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
