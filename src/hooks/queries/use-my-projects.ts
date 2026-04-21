'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { supabase } from '@/lib/supabase';

export type GenerationRow = {
  id: string;
  code: string;
  version: number;
  description: string | null;
  stack: string | null;
  prompt: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function useMyProjects(limit = 50, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.myProjects, { limit }] as const,
    enabled,
    queryFn: async (): Promise<GenerationRow[]> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) return [];

      const { data, error } = await supabase
        .from('generations')
        .select('id,code,version,description,stack,prompt,metadata,created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as GenerationRow[];
    },
  });
}

