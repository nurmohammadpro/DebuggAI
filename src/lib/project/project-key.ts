import type { GenerationRow } from '@/hooks/queries/use-my-projects';

export function getProjectKey(project: Pick<GenerationRow, 'id' | 'metadata'>) {
  const key = (project.metadata as any)?.project_key;
  if (typeof key === 'string' && key.trim()) return key.trim();
  return project.id;
}

