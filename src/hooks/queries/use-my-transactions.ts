'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/hooks/queries/query-keys';
import { getSession } from '@/hooks/use-session';
import { useSessionStore } from '@/store/session-store';

export type TransactionRow = {
  id: string;
  amount: number;
  type: 'earned' | 'spent' | 'refunded';
  source: string;
  description: string | null;
  created_at: string;
};

export function useMyTransactions(limit = 100, enabled = true) {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: [...queryKeys.myTransactions, { limit }] as const,
    enabled: enabled && isAuthenticated,
    staleTime: 0,
    gcTime: isAuthenticated ? 5 * 60 * 1000 : 10_000,
    queryFn: async (): Promise<TransactionRow[]> => {
      const session = await getSession();
      if (!session.user) throw new Error('Not authenticated — retrying...');

      const { data: wallet, error: walletError } = await supabase
        .from('credit_wallets')
        .select('id')
        .eq('user_id', session.user.id)
        .single();

      if (walletError) throw walletError;
      if (!wallet?.id) return [];

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, source, description, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as TransactionRow[];
    },
  });
}
