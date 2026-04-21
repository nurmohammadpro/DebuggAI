'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/hooks/queries/query-keys';

export type TransactionRow = {
  id: string;
  amount: number;
  type: 'earned' | 'spent' | 'refunded';
  source: string;
  description: string | null;
  created_at: string;
};

export function useMyTransactions(limit = 100, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.myTransactions, { limit }] as const,
    enabled,
    queryFn: async (): Promise<TransactionRow[]> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return [];

      const { data: wallet, error: walletError } = await supabase
        .from('credit_wallets')
        .select('id')
        .eq('owner_id', session.user.id)
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

