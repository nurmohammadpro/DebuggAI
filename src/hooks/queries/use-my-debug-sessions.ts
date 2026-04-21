'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/hooks/queries/query-keys';

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
    queryFn: async (): Promise<DebugSessionRow[]> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return [];

      const { data, error } = await supabase
        .from('debug_sessions')
        .select(
          'id,language,code,error_message,fix,explanation,tags,created_at'
        )
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as DebugSessionRow[];
    },
  });
}

