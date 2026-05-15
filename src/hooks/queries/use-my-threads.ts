'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/hooks/use-session';
import { queryKeys } from '@/hooks/queries/query-keys';

export type ThreadRow = {
  id: string;
  title: string | null;
  project_id: string | null;
  workspace_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export function useMyThreads(limit = 50, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.myThreads, { limit }] as const,
    enabled,
    queryFn: async (): Promise<ThreadRow[]> => {
      const session = await getSession();
      if (!session.user) return [];

      const { data, error } = await supabase
        .from('threads')
        .select('id,title,project_id,workspace_id,metadata,created_at,updated_at')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as ThreadRow[];
    },
  });
}

