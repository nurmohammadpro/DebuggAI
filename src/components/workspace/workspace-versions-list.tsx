'use client';

import { History, Loader2, RefreshCw } from 'lucide-react';
import { useGenerationStore } from '@/store/generation-store';
import { useProjectVersions } from '@/hooks/queries/use-project-versions';
import { useWorkspaceStore } from '@/store/workspace-store';

export function WorkspaceVersionsList() {
  const { projectKey, selectedProjectId } = useWorkspaceStore();
  const { loadFromProject } = useGenerationStore();
  const { data, isLoading, error, refetch } = useProjectVersions(
    projectKey,
    selectedProjectId,
    !!projectKey
  );

  if (!projectKey || !selectedProjectId) {
    return (
      <div className="text-xs text-muted-foreground px-2 py-4">
        Select a project to see versions.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-2 py-4">
        <div className="text-xs font-medium text-foreground">
          Failed to load versions
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Unknown error'}
        </div>
        <button
          className="mt-3 h-8 px-3 rounded-[8px] border border-border/50 text-xs inline-flex items-center gap-2 hover:bg-muted/40"
          onClick={() => refetch()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-xs text-muted-foreground px-2 py-4">
        No versions yet.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {data.map((v) => (
        <button
          key={v.id}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-[8px] text-sm text-left hover:bg-muted/40"
          onClick={() => loadFromProject(v.code, v.description || 'Version')}
        >
          <History className="h-4 w-4 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate">{v.description || 'Version'}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(v.created_at).toLocaleString()}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
