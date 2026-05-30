'use client';

import { useMemo } from 'react';
import { FileText, Folder, FileCode, FileJson, Settings, Shield, Image, Video, Music, Archive, Palette, Hash, File } from 'lucide-react';
import { buildFileTree, getFileIcon as getFileIconName, type FileTreeNode } from '@/lib/project/file-tree';
import { useGenerationStore } from '@/store/generation-store';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Folder,
  FileCode,
  FileJson,
  Settings,
  Shield,
  Image,
  Video,
  Music,
  Archive,
  Palette,
  Hash,
  File,
};

export function WorkspaceFileTreeView({ query = '' }: { query?: string }) {
  const { files, activeFilePath, setActiveFilePath } = useGenerationStore();

  const nodes = useMemo(() => {
    const paths = files ? Object.keys(files.files).filter(path => files.files[path]?.status !== 'deleted') : [];
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
          files={files}
        />
      ))}
    </div>
  );
}

function NodeRow({
  node,
  activeFilePath,
  onSelectFile,
  files,
  depth = 0,
}: {
  node: FileTreeNode;
  activeFilePath: string | null;
  onSelectFile: (path: string) => void;
  files?: Record<string, import('@/lib/project/virtual-files').VirtualFile>;
  depth?: number;
}) {
  const file = node.type === 'file' && files ? files[node.path] : undefined;

  if (node.type === 'file') {
    const active = activeFilePath === node.path;
    const Icon = iconMap[getFileIconName(node.name, false)] || FileText;
    const statusColor = {
      added: 'text-[var(--app-success)]',
      modified: 'text-[var(--app-warning)]',
      deleted: 'text-[var(--app-danger)]',
      unchanged: 'text-[var(--app-text-dim)]',
    }[file?.status || 'unchanged'];

    return (
      <button
        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-[8px] text-sm text-left hover:bg-[var(--app-surface)] transition-colors ${
          active ? 'bg-[var(--app-accent-soft)] border border-[var(--app-accent)]' : ''
        }`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => onSelectFile(node.path)}
        title={node.path}
      >
        <Icon className={`h-4 w-4 ${statusColor || 'text-[var(--app-text-dim)]'} flex-shrink-0`} />
        <span className="truncate flex-1">{node.name}</span>
        {file?.status && file.status !== 'unchanged' && (
          <span className={cn(
            "text-[9px] font-semibold uppercase ml-1",
            file.status === 'added' && "text-[var(--app-success)]",
            file.status === 'modified' && "text-[var(--app-warning)]",
            file.status === 'deleted' && "text-[var(--app-app-danger)] line-through",
          )}>
            {file.status === 'added' ? '+' : file.status === 'modified' ? '~' : '×'}
          </span>
        )}
      </button>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground hover:text-[var(--app-text)] cursor-pointer transition-colors"
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <Folder className="h-4 w-4" />
        <span className="truncate font-medium">{node.name}</span>
      </div>
      <div>
        {node.children.map((c) => (
          <NodeRow
            key={c.path}
            node={c}
            activeFilePath={activeFilePath}
            onSelectFile={setActiveFilePath}
            files={files}
            depth={depth + 1}
          />
        ))}
      </div>
    </div>
  );
}
