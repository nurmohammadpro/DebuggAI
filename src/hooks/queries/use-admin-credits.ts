'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { getAdminAuthHeaders } from '@/hooks/queries/use-admin-auth';
import { useSession } from '@/hooks/use-session';

export type AdminCreditTx = {
  id: string;
  amount: number;
  type: 'earned' | 'spent' | 'refunded';
  source: string;
  description: string | null;
  created_at: string;
  wallet?: {
    user_id: string;
    profiles?: { email: string; full_name: string | null };
  };
};

export type AdminCreditsResponse = {
  transactions: AdminCreditTx[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export function useAdminCredits(
  params: { page: number; limit: number; type?: string | null },
  enabled = true
) {
  const { user: sessionUser } = useSession();

  const queryString = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    ...(params.type ? { type: params.type } : {}),
  }).toString();

  return useQuery({
    queryKey: queryKeys.adminCredits(queryString),
    enabled: enabled && !!sessionUser,
    queryFn: async (): Promise<AdminCreditsResponse> => {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`/api/admin/credits?${queryString}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load credits');
      return json as AdminCreditsResponse;
    },
  });
}

