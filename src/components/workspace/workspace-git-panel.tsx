'use client';

import { useMemo } from 'react';
import { GitBranch, Plus, Check } from 'lucide-react';
import { useGenerationStore } from '@/store/generation-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { WorkspaceSaveVersionButton } from '@/components/workspace/workspace-save-version-button';

export function WorkspaceGitPanel() {
  const { files, savedSnapshot, getProjectCode } = useGenerationStore();
  const { selectedProjectId } = useWorkspaceStore();

  const changedFiles = useMemo(() => {
    if (!files) return [];
    return Object.entries(files.files)
      .filter(([_, f]) => f.status === 'modified' || f.status === 'added')
      .map(([path, f]) => ({ path, status: f.status! }));
  }, [files]);

  const hasChanges = useMemo(() => {
    const current = getProjectCode().trim();
    const saved = (savedSnapshot || '').trim();
    return current && saved && current !== saved;
  }, [getProjectCode, savedSnapshot]);

  if (!selectedProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <GitBranch className="h-8 w-8 text-[var(--app-text-dim)] mb-3" />
        <div className="text-[13px] font-medium text-[var(--app-text)] mb-1">Source Control</div>
        <div className="text-[11px] text-[var(--app-text-muted)] max-w-[260px]">
          Open a project to manage version control.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--app-border)] flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-muted)]">
          Changes
        </span>
        <WorkspaceSaveVersionButton />
      </div>

      <div className="flex-1 overflow-auto">
        {!hasChanges && changedFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-6">
            <Check className="h-6 w-6 text-[var(--app-success)] mb-2" />
            <div className="text-[13px] text-[var(--app-text-muted)]">No changes to commit</div>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {changedFiles.map((f) => (
              <div
                key={f.path}
                className="flex items-center gap-2 px-2 py-1.5 rounded-[6px] hover:bg-[var(--app-surface)] text-[12px]"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: f.status === 'added' ? 'var(--app-success)' : 'var(--app-warning)',
                  }}
                />
                <span className="text-[var(--app-text)] font-mono text-[11px] truncate">{f.path}</span>
                <span className="ml-auto text-[10px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                  {f.status === 'added' ? 'A' : 'M'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
