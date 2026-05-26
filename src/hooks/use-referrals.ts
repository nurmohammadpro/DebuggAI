/**
 * useReferrals Hook
 *
 * Hook for managing referral codes and tracking referrals.
 */

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';
import { csrfHeader } from '@/lib/csrf-client';

export interface Referral {
  id: string;
  code: string;
  status: 'pending' | 'completed' | 'paid';
  credits_earned: number;
  created_at: string;
  completed_at: string | null;
  referee?: {
    email: string;
    full_name: string;
  };
}

export interface ReferralStats {
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  totalCreditsEarned: number;
  ambassadorTier: string | null;
  nextMilestone: {
    tier: string;
    referrals: number;
    bonus: number;
  } | null;
}

interface UseReferralsOptions {
  onCodeGenerated?: (code: string, url: string) => void;
  onError?: (error: Error) => void;
}

export function useReferrals(options: UseReferralsOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const { user } = useSessionStore();

  /**
   * Generate a referral code for the current user
   */
  const generateCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/referrals/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeader(),
        },
        body: JSON.stringify({ userId: user?.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate referral code');
      }

      const data = await response.json();
      options.onCodeGenerated?.(data.code, data.url);
      return data;
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Track a referral when a new user signs up
   */
  const trackReferral = async (referralCode: string) => {
    setIsTracking(true);
    try {
      const response = await fetch('/api/referrals/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeader(),
        },
        body: JSON.stringify({ referralCode, userId: user?.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to track referral');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally {
      setIsTracking(false);
    }
  };

  /**
   * Get referral statistics
   */
  const getStats = async (): Promise<ReferralStats> => {
    if (!user?.id) {
      throw new Error('Not authenticated');
    }

    // Get user's referrals
    const { data: referrals } = await supabase
      .from('referrals')
      .select('status, credits_earned')
      .eq('referrer_id', user.id);

    const referralRows =
      (referrals as Array<{ status: Referral['status']; credits_earned: number }>) ||
      [];

    // Get user's profile for ambassador tier
    const { data: profile } = await supabase
      .from('profiles')
      .select('metadata')
      .eq('id', user.id)
      .single();

    const totalReferrals = referralRows.length;
    const completedReferrals = referralRows.filter((r) => r.status === 'completed').length;
    const pendingReferrals = referralRows.filter((r) => r.status === 'pending').length;
    const totalCreditsEarned = referralRows.reduce(
      (sum, r) => sum + (Number(r.credits_earned) || 0),
      0
    );

    // Calculate next milestone
    const milestones = [
      { tier: 'bronze', referrals: 5, bonus: 25 },
      { tier: 'silver', referrals: 10, bonus: 50 },
      { tier: 'gold', referrals: 25, bonus: 150 },
      { tier: 'platinum', referrals: 50, bonus: 350 },
      { tier: 'diamond', referrals: 100, bonus: 1000 },
    ];

    const currentTier = profile?.metadata?.ambassador_tier;
    const nextMilestone = milestones.find(m => m.referrals > completedReferrals) || null;

    return {
      totalReferrals,
      pendingReferrals,
      completedReferrals,
      totalCreditsEarned,
      ambassadorTier: currentTier || null,
      nextMilestone: nextMilestone ? {
        tier: nextMilestone.tier,
        referrals: nextMilestone.referrals,
        bonus: nextMilestone.bonus,
      } : null,
    };
  };

  /**
   * Get referral list
   */
  const getReferrals = async (): Promise<Referral[]> => {
    if (!user?.id) {
      throw new Error('Not authenticated');
    }

    const { data: referrals, error } = await supabase
      .from('referrals')
      .select(`
        *,
        referee:profiles!referrals_referee_id_fkey (
          email,
          full_name
        )
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (referrals as Referral[]) || [];
  };

  return {
    generateCode,
    trackReferral,
    getStats,
    getReferrals,
    isLoading,
    isTracking,
  };
}
