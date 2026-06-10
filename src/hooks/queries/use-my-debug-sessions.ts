'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/hooks/queries/query-keys';
import { getSession } from '@/hooks/use-session';
import { useSessionStore } from '@/store/session-store';

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
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

  return useQuery({
    queryKey: [...queryKeys.myDebugSessions, { limit }] as const,
    enabled: enabled && isAuthenticated,
    staleTime: 0,
    gcTime: isAuthenticated ? 5 * 60 * 1000 : 10_000,
    queryFn: async (): Promise<DebugSessionRow[]> => {
      const session = await getSession();
      if (!session.user) throw new Error('Not authenticated — retrying...');

      const { data, error } = await supabase
        .from('debug_sessions')
        .select('id,language,code,error_message,fix,explanation,tags,created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as DebugSessionRow[];
    },
  });
}
