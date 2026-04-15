/**
 * Referral Dashboard Page
 *
 * Shows referral stats, shareable link, and referral history.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useReferrals } from '@/hooks/use-referrals';
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

const AMBASSADOR_ICONS: Record<string, any> = {
  bronze: Medal,
  silver: Award,
  gold: Trophy,
  platinum: Gem,
  diamond: Diamond,
};

const AMBASSADOR_COLORS: Record<string, string> = {
  bronze: 'text-orange-500',
  silver: 'text-gray-400',
  gold: 'text-yellow-500',
  platinum: 'text-purple-500',
  diamond: 'text-cyan-400',
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
  const [stats, setStats] = useState<any>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      loadReferralData();
    }
  }, [isAuthenticated]);

  const loadReferralData = async () => {
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
    } catch (error: any) {
      console.error('Failed to load referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleGenerateCode = async () => {
    try {
      await generateCode();
    } catch (error) {
      // Error handled in hook
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
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const AmbassadorIcon = stats?.ambassadorTier
    ? AMBASSADOR_ICONS[stats.ambassadorTier]
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Referral Program</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hero Section */}
        <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-2">Invite Friends, Earn Credits</h2>
                <p className="text-muted-foreground mb-4">
                  Share your unique referral link with friends and earn <strong className="text-primary">10 credits</strong> for each signup.
                  Your friends get <strong className="text-primary">5 bonus credits</strong> too!
                </p>
                {stats?.ambassadorTier && (
                  <div className={`flex items-center gap-2 ${AMBASSADOR_COLORS[stats.ambassadorTier]}`}>
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
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="text-3xl font-bold">{stats?.totalReferrals || 0}</div>
              <div className="text-sm text-muted-foreground">Total Referrals</div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-3xl font-bold">{stats?.completedReferrals || 0}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Zap className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="text-3xl font-bold">{stats?.totalCreditsEarned || 0}</div>
              <div className="text-sm text-muted-foreground">Credits Earned</div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <Trophy className="h-5 w-5 text-purple-500" />
              </div>
              <div className="text-3xl font-bold capitalize">
                {stats?.ambassadorTier || '-'}
              </div>
              <div className="text-sm text-muted-foreground">Ambassador Tier</div>
            </div>
          </Card>
        </div>

        {/* Referral Link Section */}
        <Card className="mb-8">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Your Referral Link
            </h3>

            {referralCode ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Referral URL</label>
                  <div className="flex gap-2">
                    <Input
                      value={referralUrl}
                      readOnly
                      className="font-mono"
                    />
                    <Button onClick={handleCopyLink} variant="outline">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">Referral Code</label>
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
                <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
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
          <Card className="mb-8">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                Ambassador Progress
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">
                      {stats?.nextMilestone.tier.toUpperCase()} Tier
                    </span>
                    <span className="font-semibold">
                      {stats?.completedReferrals} / {stats?.nextMilestone.referrals} referrals
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all"
                      style={{
                        width: `${(stats?.completedReferrals / stats?.nextMilestone.referrals) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-semibold">Next Milestone Bonus</div>
                    <div className="text-sm text-muted-foreground">
                      Reach {stats?.nextMilestone.referrals} referrals
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-primary">
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
                <h3 className="text-lg font-semibold mb-4">Referral History</h3>

                {referrals.length > 0 ? (
                  <div className="space-y-2">
                    {referrals.map((referral) => (
                      <div
                        key={referral.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {referral.referee?.email || 'Pending signup'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {new Date(referral.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant={referral.status === 'completed' ? 'default' : 'secondary'}
                          >
                            {referral.status}
                          </Badge>
                          {referral.status === 'completed' && (
                            <div className="text-sm text-green-500 mt-1">
                              +{referral.credits_earned} credits
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
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
