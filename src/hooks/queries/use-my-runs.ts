'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/clerk-safe';
import { queryKeys } from '@/hooks/queries/query-keys';

export type RunRow = {
  id: string;
  thread_id: string;
  user_id: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'canceled';
  objective: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  updated_at: string;
};

export type UseMyRunsOptions = Pick<
  UseQueryOptions<RunRow[], Error>,
  'refetchInterval'
>;

export function useMyRuns(limit = 20, enabled = true, options?: UseMyRunsOptions) {
  const { user: clerkUser } = useUser();

  return useQuery<RunRow[], Error, RunRow[]>({
    queryKey: [...queryKeys.myRuns, { limit }] as const,
    enabled: enabled && !!clerkUser,
    refetchInterval: options?.refetchInterval,
    staleTime: 0,
    gcTime: clerkUser ? 5 * 60 * 1000 : 10_000,
    queryFn: async (): Promise<RunRow[]> => {
      if (!clerkUser?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('runs')
        .select('id,thread_id,user_id,status,objective,error,created_at,started_at,ended_at,updated_at')
        .eq('user_id', clerkUser.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as RunRow[];
    },
  });
}
