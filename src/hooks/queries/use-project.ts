'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { getSession, useSession } from '@/hooks/use-session';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';

export function useProject(projectId: string | null, enabled = true) {
  const { user: sessionUser } = useSession();

  return useQuery({
    queryKey: projectId ? queryKeys.project(projectId) : ['project', 'none'],
    enabled: enabled && !!projectId && !!sessionUser,
    queryFn: async (): Promise<GenerationRow | null> => {
      if (!projectId) return null;
      const { user, session } = await getSession();
      const token = session?.access_token;
      if (!user || !token) return null;

      const response = await fetch(`/api/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load project');
      }

      const project = payload?.project as {
        id: string;
        name: string | null;
        description: string | null;
        stack: string | null;
        created_at: string;
        updated_at: string;
      } | null;
      const latest = payload?.latest as {
        code: string;
        version: number;
        prompt: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      } | null;

      if (!project) return null;

      return {
        id: project.id,
        code: latest?.code ?? '',
        version: latest?.version ?? 1,
        name: project.name,
        description: project.name,
        stack: project.stack,
        prompt: latest?.prompt ?? project.description,
        metadata: latest?.metadata ?? null,
        created_at: latest?.created_at ?? project.created_at,
        updated_at: project.updated_at,
      };
    },
  });
}
