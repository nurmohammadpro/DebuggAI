'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/clerk-safe';
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
  const { user, isLoaded } = useUser();

  return useQuery({
    queryKey: [...queryKeys.myThreads, { limit, projectId: projectId || null }] as const,
    enabled: enabled && isLoaded && !!user,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    placeholderData: projectId ? undefined : (previousThreads) => previousThreads,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    queryFn: async (): Promise<ThreadRow[]> => {
      if (!user?.id) throw new Error('Not authenticated');

      let q = supabase
        .from('threads')
        .select('id,title,project_id,workspace_id,metadata,created_at,updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (projectId) q = q.eq('project_id', projectId);

      const { data, error } = await q.limit(limit);

      if (error) throw error;
      return (data || []) as ThreadRow[];
    },
  });
}
