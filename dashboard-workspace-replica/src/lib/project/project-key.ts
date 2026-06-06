import type { GenerationRow } from '@/hooks/queries/use-my-projects';

export function getProjectKey(project: Pick<GenerationRow, 'id' | 'metadata'>) {
  const metadata = project.metadata as { project_key?: unknown } | null;
  const key = metadata?.project_key;
  if (typeof key === 'string' && key.trim()) return key.trim();
  return project.id;
}
