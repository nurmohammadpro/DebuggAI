'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/hooks/queries/query-keys';
import { useUser } from '@/hooks/clerk-safe';

export type TransactionRow = {
  id: string;
  amount: number;
  type: 'earned' | 'spent' | 'refunded';
  description: string | null;
  created_at: string;
};

export function useMyTransactions(limit = 100, enabled = true) {
  const { user: clerkUser } = useUser();

  return useQuery({
    queryKey: [...queryKeys.myTransactions, { limit }] as const,
    enabled: enabled && !!clerkUser,
    staleTime: 0,
    gcTime: clerkUser ? 5 * 60 * 1000 : 10_000,
    queryFn: async (): Promise<TransactionRow[]> => {
      if (!clerkUser?.id) throw new Error('Not authenticated');

      const { data: wallet, error: walletError } = await supabase
        .from('credit_wallets')
        .select('id')
        .eq('user_id', clerkUser.id)
        .single();

      if (walletError) throw walletError;
      if (!wallet?.id) return [];

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, description, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as TransactionRow[];
    },
  });
}
