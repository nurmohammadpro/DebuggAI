'use client';

import { useQuery } from '@tanstack/react-query';
import { getSession } from '@/hooks/use-session';

interface ProjectBoot {
  project: {
    id: string;
    name: string | null;
    description: string | null;
    stack: string | null;
    status: string;
    created_at: string;
    updated_at: string;
  };
  latest: {
    id: string;
    code: string;
    version: number;
    prompt: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
  } | null;
  firstThread: {
    id: string;
    title: string | null;
  } | null;
}

export function useProjectBoot(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: projectId ? ['project-boot', projectId] : ['project-boot', 'none'],
    enabled: enabled && !!projectId,
    staleTime: 10_000,
    gcTime: 5 * 60 * 1000,
    placeholderData: (previousBoot) => previousBoot,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    queryFn: async (): Promise<ProjectBoot | null> => {
      if (!projectId) return null;
      const { session } = await getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Not authenticated — retrying...');
      const res = await fetch(`/api/projects/${projectId}/boot`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load project');
      return res.json();
    },
  });
}

export type { ProjectBoot };
