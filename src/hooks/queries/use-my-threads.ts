'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';
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

export function useMyThreads(limit = 50, enabled = true, projectId?: string | null) {
  const userId = useSessionStore((s) => s.user?.id);

  return useQuery({
    queryKey: [...queryKeys.myThreads, { limit, projectId: projectId || null }] as const,
    enabled: enabled && !!userId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    placeholderData: projectId ? undefined : (previousThreads) => previousThreads,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    queryFn: async (): Promise<ThreadRow[]> => {
      if (!userId) throw new Error('Not authenticated');

      let q = supabase
        .from('threads')
        .select('id,title,project_id,workspace_id,metadata,created_at,updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (projectId) q = q.eq('project_id', projectId);

      const { data, error } = await q.limit(limit);

      if (error) throw error;
      return (data || []) as ThreadRow[];
    },
  });
}
