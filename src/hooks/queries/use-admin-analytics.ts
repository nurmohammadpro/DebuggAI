'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { getAdminAuthHeaders } from '@/hooks/queries/use-admin-auth';
import { useSession } from '@/hooks/use-session';

export type AdminAnalyticsData = {
  summary: {
    totalUsers: number;
    newUsers: number;
    activeUsers: number;
    totalCreditsEarned: number;
    totalCreditsSpent: number;
    totalDebugSessions: number;
    totalGenerations: number;
    totalReferralCredits: number;
  };
  planDistribution: {
    free: number;
    pro: number;
    enterprise: number;
  };
  dailyStats: Array<{
    date: string;
    newUsers: number;
    creditsSpent: number;
  }>;
};

export function useAdminAnalytics(period: '7d' | '30d' | '90d', enabled = true) {
  const { user: sessionUser } = useSession();

  return useQuery({
    queryKey: queryKeys.adminAnalytics(period),
    enabled: enabled && !!sessionUser,
    queryFn: async (): Promise<AdminAnalyticsData> => {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`/api/admin/analytics?period=${period}`, {
        headers,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load analytics');
      return json as AdminAnalyticsData;
    },
  });
}

