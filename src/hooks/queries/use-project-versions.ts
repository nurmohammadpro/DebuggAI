'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/clerk-safe';
import { queryKeys } from '@/hooks/queries/query-keys';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';

export function useProjectVersions(
  projectKey: string | null,
  projectId: string | null,
  enabled = true
) {
  const { user: clerkUser } = useUser();

  return useQuery({
    queryKey: projectKey
      ? [...queryKeys.projectVersions(projectKey), { projectId }] as const
      : ['project-versions', 'none'],
    enabled: enabled && !!projectKey && !!clerkUser,
    queryFn: async (): Promise<GenerationRow[]> => {
      if (!projectKey || !clerkUser) return [];

      const baseQuery = supabase
        .from('generations')
        .select('id,code,version,description,stack,prompt,metadata,created_at')
        .eq('user_id', clerkUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: keyVersions, error } = projectId
        ? await baseQuery.eq('project_id', projectId)
        : await baseQuery.contains('metadata', { project_key: projectKey });

      if (error) throw error;

      let root: GenerationRow | null = null;
      if (projectId) {
        const { data: byId, error: byIdError } = await supabase
          .from('generations')
          .select('id,code,version,description,stack,prompt,metadata,created_at')
          .eq('id', projectId)
          .single();
        if (!byIdError && byId) root = byId as GenerationRow;
      }

      const merged = new Map<string, GenerationRow>();
      for (const v of (keyVersions || []) as GenerationRow[]) merged.set(v.id, v);
      if (root) merged.set(root.id, root);

      return [...merged.values()].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });
}
