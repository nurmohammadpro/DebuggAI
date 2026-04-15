/**
 * Ambassador Leaderboard Component
 *
 * Shows top referrers and ambassador tiers.
 */

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Trophy,
  Medal,
  Award,
  Gem,
  Diamond,
  Crown,
  TrendingUp
} from 'lucide-react';

const AMBASSADOR_CONFIG = {
  bronze: {
    icon: Medal,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    minReferrals: 5,
    bonus: 25,
  },
  silver: {
    icon: Award,
    color: 'text-gray-400',
    bg: 'bg-gray-400/10',
    borderColor: 'border-gray-400/20',
    minReferrals: 10,
    bonus: 50,
  },
  gold: {
    icon: Trophy,
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/20',
    minReferrals: 25,
    bonus: 150,
  },
  platinum: {
    icon: Gem,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
    minReferrals: 50,
    bonus: 350,
  },
  diamond: {
    icon: Diamond,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    borderColor: 'border-cyan-400/20',
    minReferrals: 100,
    bonus: 1000,
  },
};

interface LeaderboardEntry {
  referrer_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  total_referrals: number;
  total_credits: number;
  ambassador_tier: string | null;
}

export function AmbassadorLeaderboard() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'month'>('all');

  useEffect(() => {
    loadLeaderboard();
  }, [period]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/referrals/leaderboard');
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
    return null;
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Tier Information */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            Ambassador Tiers
          </h3>
          <div className="grid md:grid-cols-5 gap-4">
            {Object.entries(AMBASSADOR_CONFIG).map(([tier, config]) => {
              const Icon = config.icon;
              return (
                <div
                  key={tier}
                  className={`p-4 rounded-lg border ${config.bg} ${config.borderColor}`}
                >
                  <div className={`flex items-center justify-between mb-2 ${config.color}`}>
                    <Icon className="h-6 w-6" />
                    <span className="text-xs font-semibold uppercase">{tier}</span>
                  </div>
                  <div className="text-2xl font-bold mb-1">{config.minReferrals}</div>
                  <div className="text-xs text-muted-foreground">referrals</div>
                  <div className="text-sm font-semibold text-green-500 mt-2">
                    +{config.bonus} bonus
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Leaderboard */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Ambassadors
            </h3>
            <Badge variant="secondary">{leaderboard.length} ambassadors</Badge>
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading leaderboard...
            </div>
          ) : leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const tierConfig = entry.ambassador_tier
                  ? AMBASSADOR_CONFIG[entry.ambassador_tier as keyof typeof AMBASSADOR_CONFIG]
                  : null;
                const TierIcon = tierConfig?.icon;

                return (
                  <div
                    key={entry.referrer_id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:bg-muted/50 ${
                      index === 0 ? 'bg-yellow-500/5 border-yellow-500/20' : ''
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center font-bold text-lg">
                      {getRankIcon(index) || `#${index + 1}`}
                    </div>

                    {/* Avatar */}
                    <Avatar>
                      {entry.avatar_url ? (
                        <AvatarImage src={entry.avatar_url} />
                      ) : (
                        <AvatarFallback>{getInitials(entry.full_name, entry.email)}</AvatarFallback>
                      )}
                    </Avatar>

                    {/* Name & Tier */}
                    <div className="flex-1">
                      <div className="font-medium">
                        {entry.full_name || entry.email.split('@')[0]}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {TierIcon && (
                          <div className={`flex items-center gap-1 ${tierConfig.color}`}>
                            <TierIcon className="h-3 w-3" />
                            <span className="text-xs capitalize">{entry.ambassador_tier}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="text-right">
                      <div className="font-semibold">{entry.total_referrals}</div>
                      <div className="text-xs text-muted-foreground">referrals</div>
                    </div>

                    <div className="text-right w-24">
                      <div className="font-semibold text-green-500">{entry.total_credits}</div>
                      <div className="text-xs text-muted-foreground">earned</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No ambassadors yet. Be the first!</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
