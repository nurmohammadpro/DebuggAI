'use client';

import { Bug, Wand2 } from 'lucide-react';
import type { WorkspaceMode } from '@/store/workspace-store';

export function WorkspaceModeToggle({
  mode,
  onModeChange,
}: {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-0.5">
      <button
        type="button"
        className={`h-7 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] transition-all inline-flex items-center gap-2 ${
          mode === 'build'
            ? 'bg-[var(--app-accent)] text-black'
            : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
        }`}
        onClick={() => onModeChange('build')}
      >
        <Wand2 className="h-3.5 w-3.5" />
        Build
      </button>
      <button
        type="button"
        className={`h-7 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] transition-all inline-flex items-center gap-2 ${
          mode === 'debug'
            ? 'bg-[var(--app-accent)] text-black'
            : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
        }`}
        onClick={() => onModeChange('debug')}
      >
        <Bug className="h-3.5 w-3.5" />
        Debug
      </button>
    </div>
  );
}
