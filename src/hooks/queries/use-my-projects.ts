'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { getSession } from '@/hooks/use-session';

export type GenerationRow = {
  id: string;
  code?: string;
  version: number;
  name?: string | null;
  description: string | null;
  stack: string | null;
  prompt: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at?: string;
};

export function useMyProjects(limit = 50, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.myProjects, { limit }] as const,
    enabled,
    // Keep cached data for 30s after auth state changes so the UI
    // doesn't flash empty while the bootstrapper initializes.
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousProjects) => previousProjects,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    queryFn: async (): Promise<GenerationRow[]> => {
      const { user, session } = await getSession();
      const token = session?.access_token;
      if (!user || !token) {
        // Throw instead of returning [] — React Query will retry.
        // Returning [] would cache the empty array permanently.
        throw new Error('Not authenticated — retrying...');
      }

      const response = await fetch(`/api/projects?limit=${limit}&page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load projects');
      }

      const projects = (Array.isArray(payload?.projects) ? payload.projects : []) as Array<{
        id: string;
        name: string | null;
        description: string | null;
        stack: string | null;
        created_at: string;
        updated_at: string;
      }>;

      return projects.map((project) => ({
        id: project.id,
        code: undefined,
        version: 1,
        name: project.name ?? null,
        description: project.name ?? null,
        stack: project.stack ?? null,
        prompt: project.description ?? null,
        metadata: null,
        created_at: project.created_at,
        updated_at: project.updated_at,
      })) as GenerationRow[];
    },
  });
}
