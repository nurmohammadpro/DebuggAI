'use client';

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReferrals } from '@/hooks/use-referrals';
import type { ReferralStats, Referral } from '@/hooks/use-referrals';
import { useSessionStore } from '@/store/session-store';
import { AmbassadorLeaderboard } from '@/components/referrals/ambassador-leaderboard';
import {
  Gift,
  Users,
  Trophy,
  Share2,
  Copy,
  Check,
  TrendingUp,
  Zap,
  Crown,
  Medal,
  Award,
  Gem,
  Diamond,
  Coins,
} from 'lucide-react';
import { toast } from 'sonner';

const AMBASSADOR_ICONS: Record<string, React.ElementType> = {
  bronze: Medal,
  silver: Award,
  gold: Trophy,
  platinum: Gem,
  diamond: Diamond,
};

const AMBASSADOR_COLORS: Record<string, string> = {
  bronze: 'var(--app-warning)',
  silver: 'var(--app-text-dim)',
  gold: 'var(--app-warning)',
  platinum: 'var(--app-purple)',
  diamond: 'var(--app-info)',
};

export default function ReferralsPage() {
  const { user, isAuthenticated } = useSessionStore();
  const { generateCode, getStats, getReferrals, isLoading } = useReferrals({
    onCodeGenerated: (code, url) => {
      setReferralCode(code);
      setReferralUrl(url);
      toast.success('Referral code generated!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralUrl, setReferralUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const loadReferralData = useCallback(async () => {
    try {
      setLoadingStats(true);
      const [statsData, referralsData] = await Promise.all([
        getStats(),
        getReferrals(),
      ]);
      setStats(statsData);

      if (referralsData.length > 0) {
        setReferralCode(referralsData[0].code);
        const origin = window.location.origin;
        setReferralUrl(`${origin}?ref=${referralsData[0].code}`);
      }

      setReferrals(referralsData);
    } catch (error) {
      console.error('Failed to load referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoadingStats(false);
    }
  }, [getStats, getReferrals]);

  useEffect(() => {
    if (isAuthenticated) {
      loadReferralData();
    }
  }, [isAuthenticated, loadReferralData]);

  const handleGenerateCode = async () => {
    try {
      await generateCode();
    } catch (error) {
      console.log(error)
    }
  };

  const handleCopyLink = async () => {
    if (referralUrl) {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    if (referralCode) {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  if (loadingStats) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--app-text-muted)]">Loading...</div>
      </div>
    );
  }

  const AmbassadorIcon = stats?.ambassadorTier
    ? AMBASSADOR_ICONS[stats.ambassadorTier]
    : null;

  return (
    <div className="p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Gift className="h-4 w-4 text-[var(--app-accent)]" />
          <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">Referral Program</h1>
        </div>
        <p className="text-[13px] text-[var(--app-text-muted)] mt-1">
          Invite friends and earn credits together
        </p>
      </div>

      {/* Hero Section */}
      <div className="rounded-[6px] bg-[var(--app-accent-soft)] backdrop-blur-xl p-4 sm:p-6 lg:p-8 mb-6 border border-[var(--app-accent)]/10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="text-center lg:text-left">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-[var(--app-text)] mb-2">Invite Friends, Earn Credits</h2>
            <p className="text-[var(--app-text-muted)] mb-4">
              Share your unique referral link with friends and earn <strong className="text-[var(--app-accent)]">10 credits</strong> for each signup.
              Your friends get <strong className="text-[var(--app-accent)]">5 bonus credits</strong> too!
            </p>
            {stats?.ambassadorTier && (
              <div className="flex items-center justify-center lg:justify-start gap-2" style={{ color: AMBASSADOR_COLORS[stats.ambassadorTier] }}>
                {AmbassadorIcon && <AmbassadorIcon className="h-5 w-5" />}
                <span className="font-semibold capitalize">{stats.ambassadorTier} Ambassador</span>
              </div>
            )}
          </div>
          <Gift className="h-12 w-12 sm:h-16 sm:w-16 self-center text-[var(--app-accent)]" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-[var(--app-text-dim)]" />
          </div>
          <div className="text-lg sm:text-xl font-semibold text-[var(--app-info)]">{stats?.totalReferrals || 0}</div>
          <div className="text-xs sm:text-[13px] text-[var(--app-text-muted)]">Total Referrals</div>
        </div>

        <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-[var(--app-success)]" />
          </div>
          <div className="text-lg sm:text-xl font-semibold text-[var(--app-success)]">{stats?.completedReferrals || 0}</div>
          <div className="text-xs sm:text-[13px] text-[var(--app-text-muted)]">Completed</div>
        </div>

        <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Zap className="h-5 w-5 text-[var(--app-warning)]" />
          </div>
          <div className="text-lg sm:text-xl font-semibold text-[var(--app-warning)]">{stats?.totalCreditsEarned || 0}</div>
          <div className="text-xs sm:text-[13px] text-[var(--app-text-muted)]">Credits Earned</div>
        </div>

        <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <Trophy className="h-5 w-5 text-[var(--app-purple)]" />
          </div>
          <div className="text-lg sm:text-xl font-semibold capitalize text-[var(--app-purple)]">
            {stats?.ambassadorTier || '-'}
          </div>
          <div className="text-xs sm:text-[13px] text-[var(--app-text-muted)]">Ambassador Tier</div>
        </div>
      </div>

      {/* Referral Link Section */}
      <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-4 sm:p-6 mb-6">
        <h3 className="text-[16px] font-medium text-[var(--app-text)] mb-4 flex items-center gap-2">
          <Share2 className="h-5 w-5 text-[var(--app-accent)]" />
          Your Referral Link
        </h3>

        {referralCode ? (
          <div className="space-y-4">
            <div>
              <label className="text-[13px] text-[var(--app-text-muted)] mb-2 block">Referral URL</label>
              <div className="flex gap-2">
                <input
                  value={referralUrl ?? ''}
                  readOnly
                  className="flex-1 h-9 font-mono text-[13px] rounded-[6px] border-0 bg-[var(--app-panel-2)] px-3 text-[var(--app-text)] outline-none"
                />
                <button onClick={handleCopyLink} className="h-9 w-9 rounded-[6px] inline-flex items-center justify-center border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[13px] text-[var(--app-text-muted)] mb-2 block">Referral Code</label>
              <div className="flex gap-2">
                <input
                  value={referralCode}
                  readOnly
                  className="flex-1 h-9 font-mono text-center text-base sm:text-lg rounded-[6px] border-0 bg-[var(--app-panel-2)] px-3 text-[var(--app-text)] outline-none"
                />
                <button onClick={handleCopyCode} className="h-9 w-9 rounded-[6px] inline-flex items-center justify-center border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  const text = `Join DeBuggAI and get 5 bonus credits! Use my referral link: ${referralUrl}`;
                  if (navigator.share) {
                    navigator.share({ title: 'Join DeBuggAI', text });
                  } else {
                    navigator.clipboard.writeText(text);
                    toast.success('Share text copied!');
                  }
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-[6px] bg-[var(--app-accent)] px-4 py-2 text-[13px] font-medium text-[var(--app-bg)] transition-colors hover:opacity-90"
              >
                <Share2 className="h-4 w-4" />
                Share Link
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Gift className="h-12 w-12 mx-auto text-[var(--app-text-dim)] mb-4" />
            <p className="text-[13px] text-[var(--app-text-muted)] mb-4">
              Generate your unique referral code to start earning credits!
            </p>
            <button onClick={handleGenerateCode} disabled={isLoading} className="inline-flex items-center rounded-[6px] bg-[var(--app-accent)] px-4 py-2 text-[13px] font-medium text-[var(--app-bg)] transition-colors hover:opacity-90 disabled:opacity-50">
              {isLoading ? 'Generating...' : 'Generate Referral Code'}
            </button>
          </div>
        )}
      </div>

      {/* Milestone Progress */}
      {stats?.ambassadorTier && stats?.nextMilestone && (
        <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-4 sm:p-6 mb-6">
          <h3 className="text-[16px] font-medium text-[var(--app-text)] mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-[var(--app-warning)]" />
            Ambassador Progress
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-[13px] mb-2">
                <span className="text-[var(--app-text-muted)]">
                  {stats?.nextMilestone.tier.toUpperCase()} Tier
                </span>
                <span className="font-semibold text-[var(--app-text)]">
                  {stats?.completedReferrals} / {stats?.nextMilestone.referrals} referrals
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden bg-[var(--app-surface)]">
                <div
                  className="h-full transition-all bg-[var(--app-accent)] rounded-full"
                  style={{
                    width: `${(stats?.completedReferrals / stats?.nextMilestone.referrals) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-[6px] bg-[var(--app-panel-2)]">
              <div>
                <div className="text-[13px] font-medium text-[var(--app-text)]">Next Milestone Bonus</div>
                <div className="text-[13px] text-[var(--app-text-muted)]">
                  Reach {stats?.nextMilestone.referrals} referrals
                </div>
              </div>
              <div className="text-lg font-semibold text-[var(--app-accent)] flex items-center gap-2">
                +{stats?.nextMilestone.bonus} <Coins className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs for Referrals and Leaderboard */}
      <Tabs defaultValue="my-referrals" className="w-full">
        <TabsList className="grid w-full max-w-xs sm:max-w-md grid-cols-2 rounded-[6px] bg-[var(--app-panel)] p-1">
          <TabsTrigger value="my-referrals" className="rounded-[6px] text-[13px]">My Referrals</TabsTrigger>
          <TabsTrigger value="leaderboard" className="rounded-[6px] text-[13px]">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="my-referrals" className="mt-6">
          <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-4 sm:p-6">
            <h3 className="text-[16px] font-medium text-[var(--app-text)] mb-4">Referral History</h3>

            {referrals.length > 0 ? (
              <div className="space-y-2">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-[var(--app-border)] rounded-[6px] hover:bg-[var(--app-panel-2)] transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-[6px] flex items-center justify-center shrink-0 bg-[var(--app-accent-soft)]">
                        <Users className="h-5 w-5 text-[var(--app-accent)]" />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-[var(--app-text)]">
                          {referral.referee?.email || 'Pending signup'}
                        </div>
                        <div className="text-[13px] text-[var(--app-text-muted)]">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span
                        className={`inline-flex rounded-[6px] px-2 py-0.5 text-[11px] font-normal ${
                          referral.status === 'completed'
                            ? 'bg-[var(--app-success-soft)] text-[var(--app-success)]'
                            : 'bg-[var(--app-surface)] text-[var(--app-text-muted)]'
                        }`}
                      >
                        {referral.status}
                      </span>
                      {referral.status === 'completed' && (
                        <div className="text-[13px] mt-1 text-[var(--app-success)]">
                          +{referral.credits_earned} credits
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Gift className="h-12 w-12 mx-auto mb-4 text-[var(--app-text-dim)]" />
                <p className="text-[13px] text-[var(--app-text-muted)]">No referrals yet. Share your link to start earning!</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-6">
          <AmbassadorLeaderboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
