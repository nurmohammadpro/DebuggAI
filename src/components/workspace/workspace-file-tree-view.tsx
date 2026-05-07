'use client';

import { useMemo } from 'react';
import { FileText, Folder } from 'lucide-react';
import { buildFileTree, type FileTreeNode } from '@/lib/project/file-tree';
import { useGenerationStore } from '@/store/generation-store';

export function WorkspaceFileTreeView({ query = '' }: { query?: string }) {
  const { files, activeFilePath, setActiveFilePath } = useGenerationStore();

  const nodes = useMemo(() => {
    const paths = files ? Object.keys(files.files) : [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? paths.filter((p) => p.toLowerCase().includes(q))
      : paths;
    return buildFileTree(filtered);
  }, [files, query]);

  if (!files || Object.keys(files.files).length === 0) {
    return (
      <div className="text-xs text-muted-foreground px-2 py-4">
        Open a project from <span className="text-foreground">Projects</span> to see its files.
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="text-xs text-muted-foreground px-2 py-4">
        No matching files.
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {nodes.map((n) => (
        <NodeRow
          key={n.path}
          node={n}
          activeFilePath={activeFilePath}
          onSelectFile={setActiveFilePath}
        />
      ))}
    </div>
  );
}

function NodeRow({
  node,
  activeFilePath,
  onSelectFile,
  depth = 0,
}: {
  node: FileTreeNode;
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  depth?: number;
}) {
  if (node.type === 'file') {
    const active = activeFilePath === node.path;
    return (
      <button
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[8px] text-sm text-left hover:bg-muted/40 ${
          active ? 'bg-muted/50' : ''
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => onSelectFile(node.path)}
        title={node.path}
      >
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground"
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <Folder className="h-4 w-4" />
        <span className="truncate">{node.name}</span>
      </div>
      <div>
        {node.children.map((c) => (
          <NodeRow
            key={c.path}
            node={c}
            activeFilePath={activeFilePath}
            onSelectFile={onSelectFile}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}

