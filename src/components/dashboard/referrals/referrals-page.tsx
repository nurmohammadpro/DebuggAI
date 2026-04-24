/**
 * Referral Dashboard Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  Gem,
  Medal,
  Award,
  Diamond
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
  bronze: 'var(--ds-amber)',
  silver: 'var(--ds-text3)',
  gold: 'var(--ds-amber)',
  platinum: 'var(--ds-purple)',
  diamond: 'var(--ds-blue)',
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

      // Get existing referral code from the first referral
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
    return null; // Will redirect
  }

  if (loadingStats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-text2">Loading...</div>
      </div>
    );
  }

  const AmbassadorIcon = stats?.ambassadorTier
    ? AMBASSADOR_ICONS[stats.ambassadorTier]
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center gap-2">
          <Gift className="h-5 w-5" style={{ color: 'var(--ds-green)' }} />
          <h1 className="h2">Referral Program</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <Card className="mb-6 border-green/20" style={{ background: 'var(--ds-green-muted)', boxShadow: '0 0 0 1px rgba(0,200,83,0.1)' }}>
          <div className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="display mb-2">Invite Friends, Earn Credits</h2>
                <p className="text-text2 mb-4">
                  Share your unique referral link with friends and earn <strong style={{ color: 'var(--ds-green)' }}>10 credits</strong> for each signup.
                  Your friends get <strong style={{ color: 'var(--ds-green)' }}>5 bonus credits</strong> too!
                </p>
                {stats?.ambassadorTier && (
                  <div className="flex items-center gap-2" style={{ color: AMBASSADOR_COLORS[stats.ambassadorTier] }}>
                    {AmbassadorIcon && <AmbassadorIcon className="h-5 w-5" />}
                    <span className="font-semibold capitalize">{stats.ambassadorTier} Ambassador</span>
                  </div>
                )}
              </div>
              <div className="text-6xl">🎁</div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-text3" />
              </div>
              <div className="stat" style={{ color: 'var(--ds-blue)' }}>{stats?.totalReferrals || 0}</div>
              <div className="text-sm text-text3">Total Referrals</div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5" style={{ color: 'var(--ds-green)' }} />
              </div>
              <div className="stat" style={{ color: 'var(--ds-green)' }}>{stats?.completedReferrals || 0}</div>
              <div className="text-sm text-text3">Completed</div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-5 w-5" style={{ color: 'var(--ds-amber)' }} />
              </div>
              <div className="stat" style={{ color: 'var(--ds-amber)' }}>{stats?.totalCreditsEarned || 0}</div>
              <div className="text-sm text-text3">Credits Earned</div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="h-5 w-5" style={{ color: 'var(--ds-purple)' }} />
              </div>
              <div className="stat capitalize" style={{ color: 'var(--ds-purple)' }}>
                {stats?.ambassadorTier || '-'}
              </div>
              <div className="text-sm text-text3">Ambassador Tier</div>
            </div>
          </Card>
        </div>

        {/* Referral Link Section */}
        <Card className="mb-6">
          <div className="p-6">
            <h3 className="h3 mb-4 flex items-center gap-2">
              <Share2 className="h-5 w-5" style={{ color: 'var(--ds-green)' }} />
              Your Referral Link
            </h3>

            {referralCode ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-text2 mb-2 block">Referral URL</label>
                  <div className="flex gap-2">
                    <Input
                      value={referralUrl ?? ''}
                      readOnly
                      className="font-mono"
                    />
                    <Button onClick={handleCopyLink} variant="outline">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-text2 mb-2 block">Referral Code</label>
                  <div className="flex gap-2">
                    <Input
                      value={referralCode}
                      readOnly
                      className="font-mono text-center text-lg"
                    />
                    <Button onClick={handleCopyCode} variant="outline">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const text = `Join DeBuggAI and get 5 bonus credits! Use my referral link: ${referralUrl}`;
                      if (navigator.share) {
                        navigator.share({ title: 'Join DeBuggAI', text });
                      } else {
                        navigator.clipboard.writeText(text);
                        toast.success('Share text copied!');
                      }
                    }}
                    className="flex-1"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Link
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Gift className="h-12 w-12 mx-auto text-text3 mb-4" />
                <p className="text-text2 mb-4">
                  Generate your unique referral code to start earning credits!
                </p>
                <Button onClick={handleGenerateCode} disabled={isLoading}>
                  {isLoading ? 'Generating...' : 'Generate Referral Code'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Milestone Progress */}
        {stats?.ambassadorTier && stats?.nextMilestone && (
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="h3 mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5" style={{ color: 'var(--ds-amber)' }} />
                Ambassador Progress
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text2">
                      {stats?.nextMilestone.tier.toUpperCase()} Tier
                    </span>
                    <span className="font-semibold text-text">
                      {stats?.completedReferrals} / {stats?.nextMilestone.referrals} referrals
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--ds-surface3)' }}>
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(stats?.completedReferrals / stats?.nextMilestone.referrals) * 100}%`,
                        background: 'var(--ds-green)',
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-ds" style={{ background: 'var(--ds-surface2)' }}>
                  <div>
                    <div className="font-semibold text-text">Next Milestone Bonus</div>
                    <div className="text-sm text-text2">
                      Reach {stats?.nextMilestone.referrals} referrals
                    </div>
                  </div>
                  <div className="stat" style={{ color: 'var(--ds-green)' }}>
                    +{stats?.nextMilestone.bonus} 🪙
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs for Referrals and Leaderboard */}
        <Tabs defaultValue="my-referrals" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="my-referrals">My Referrals</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="my-referrals" className="mt-6">
            {/* Referral History */}
            <Card>
              <div className="p-6">
                <h3 className="h3 mb-4">Referral History</h3>

                {referrals.length > 0 ? (
                  <div className="space-y-2">
                    {referrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between p-4 border border-border rounded-ds hover:bg-card2"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: 'var(--ds-green-muted)' }}>
                            <Users className="h-5 w-5" style={{ color: 'var(--ds-green)' }} />
                          </div>
                          <div>
                            <div className="font-medium text-text">
                              {referral.referee?.email || 'Pending signup'}
                            </div>
                            <div className="text-sm text-text2">
                              {new Date(referral.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={referral.status === 'completed' ? 'green' : 'gray'}
                            pill
                          >
                            {referral.status}
                          </Badge>
                          {referral.status === 'completed' && (
                            <div className="text-sm mt-1" style={{ color: 'var(--ds-green)' }}>
                              +{referral.credits_earned} credits
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-text2">
                    <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No referrals yet. Share your link to start earning!</p>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="mt-6">
            <AmbassadorLeaderboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
