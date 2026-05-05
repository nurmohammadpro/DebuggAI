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
          className={`h-8 px-3 rounded-full text-xs border transition-colors shrink-0 ${
            activeFilePath === path
              ? 'bg-muted/50 border-border/60 text-foreground'
              : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/30 hover:border-border/50'
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
