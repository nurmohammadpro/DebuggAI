'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/hooks/queries/query-keys';
import { getClerkToken } from '@/lib/clerk-token';

export type DebugSessionRow = {
  id: string;
  language: string;
  code: string;
  error_message: string | null;
  fix: string | null;
  explanation: string | null;
  tags: string[] | null;
  created_at: string;
};

export function useMyDebugSessions(limit = 25, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.myDebugSessions, { limit }] as const,
    enabled,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousSessions) => previousSessions,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    queryFn: async (): Promise<DebugSessionRow[]> => {
      const token = getClerkToken();
      if (!token) throw new Error('Not authenticated — retrying...');

      const { data, error } = await supabase
        .from('debug_sessions')
        .select('id,language,code,error_message,fix,explanation,tags,created_at')
        .eq('user_id', token)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as DebugSessionRow[];
    },
  });
}
