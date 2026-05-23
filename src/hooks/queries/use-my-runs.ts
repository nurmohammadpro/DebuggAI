'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/hooks/use-session';
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

export function useMyRuns(limit = 20, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.myRuns, { limit }] as const,
    enabled,
    queryFn: async (): Promise<RunRow[]> => {
      const session = await getSession();
      if (!session.user) return [];

      const { data, error } = await supabase
        .from('runs')
        .select('id,thread_id,user_id,status,objective,error,created_at,started_at,ended_at,updated_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as RunRow[];
    },
  });
}

