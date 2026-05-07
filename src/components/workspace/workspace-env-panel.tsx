'use client';

import { useState } from 'react';
import { SlidersHorizontal, Plus, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';

interface EnvVar {
  key: string;
  value: string;
}

export function WorkspaceEnvPanel() {
  const { selectedProjectId, projectKey } = useWorkspaceStore();
  const [vars, setVars] = useState<EnvVar[]>(() => {
    try {
      const stored = localStorage.getItem(`debuggai.env.${projectKey}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const persist = (updated: EnvVar[]) => {
    setVars(updated);
    if (projectKey) {
      localStorage.setItem(`debuggai.env.${projectKey}`, JSON.stringify(updated));
    }
  };

  const addVar = () => {
    persist([...vars, { key: '', value: '' }]);
  };

  const updateVar = (idx: number, field: 'key' | 'value', val: string) => {
    const updated = vars.map((v, i) => (i === idx ? { ...v, [field]: val } : v));
    persist(updated);
  };

  const removeVar = (idx: number) => {
    persist(vars.filter((_, i) => i !== idx));
  };

  if (!selectedProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <SlidersHorizontal className="h-8 w-8 text-[var(--app-text-dim)] mb-3" />
        <div className="text-[13px] font-medium text-[var(--app-text)] mb-1">Environment</div>
        <div className="text-[11px] text-[var(--app-text-muted)] max-w-[260px]">
          Open a project to manage environment variables.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--app-border)] flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-muted)]">
          Environment Variables
        </span>
        <button
          onClick={addVar}
          className="h-7 w-7 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors"
          title="Add variable"
        >
          <Plus className="h-3.5 w-3.5 text-[var(--app-text-dim)]" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-2">
        {vars.length === 0 ? (
          <div className="text-[12px] text-[var(--app-text-muted)] text-center py-6">
            No environment variables defined.
          </div>
        ) : (
          vars.map((v, idx) => (
            <div key={idx} className="flex gap-1.5">
              <input
                value={v.key}
                onChange={(e) => updateVar(idx, 'key', e.target.value)}
                placeholder="KEY"
                className="flex-1 h-8 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] px-2 text-[11px] font-mono text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)]/30"
              />
              <input
                value={v.value}
                onChange={(e) => updateVar(idx, 'value', e.target.value)}
                placeholder="value"
                className="flex-1 h-8 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] px-2 text-[11px] font-mono text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)]/30"
              />
              <button
                onClick={() => removeVar(idx)}
                className="h-8 w-8 rounded-[6px] hover:bg-[var(--app-danger)]/10 flex items-center justify-center transition-colors"
                title="Remove"
              >
                <Trash2 className="h-3.5 w-3.5 text-[var(--app-text-dim)]" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
