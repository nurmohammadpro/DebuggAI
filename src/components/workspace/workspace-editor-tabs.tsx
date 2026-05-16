'use client';

import { useMemo } from 'react';
import { useGenerationStore } from '@/store/generation-store';

export function WorkspaceEditorTabs() {
  const { files, activeFilePath, setActiveFilePath } = useGenerationStore();

  const orderedPaths = useMemo(() => {
    const all = files ? Object.keys(files.files) : [];
    return all.sort();
  }, [files]);

  if (!files || orderedPaths.length === 0) return null;

  return (
    <>
      {orderedPaths.map((path) => (
        <button
          key={path}
          className={`h-8 px-3 rounded-[6px] text-[11px] border transition-colors shrink-0 font-mono max-w-[220px] truncate ${
            activeFilePath === path
              ? 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text)]'
              : 'bg-transparent border-transparent text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:border-[var(--app-border)] hover:text-[var(--app-text)]'
          }`}
          onClick={() => setActiveFilePath(path)}
          title={path}
        >
          {basename(path)}
        </button>
      ))}
    </>
  );
}

function basename(path: string) {
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}
