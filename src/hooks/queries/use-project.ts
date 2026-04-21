'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { supabase } from '@/lib/supabase';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';

export function useProject(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: projectId ? queryKeys.project(projectId) : ['project', 'none'],
    enabled: enabled && !!projectId,
    queryFn: async (): Promise<GenerationRow | null> => {
      if (!projectId) return null;
      const { data, error } = await supabase
        .from('generations')
        .select('id,code,version,description,stack,prompt,metadata,created_at')
        .eq('id', projectId)
        .single();
      if (error) throw error;
      return data as GenerationRow;
    },
  });
}

