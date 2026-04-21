'use client';

import { useMemo, useState } from 'react';
import { FileText, Folder, RefreshCw, FilePlus, FolderPlus } from 'lucide-react';

import type { WorkspaceLeftView } from './workspace-icon-sidebar';

type TreeItem =
  | { type: 'folder'; name: string; children: TreeItem[] }
  | { type: 'file'; name: string };

export function WorkspaceFileTree({
  view,
  onSelectFile,
}: {
  view: WorkspaceLeftView;
  onSelectFile: (fileName: string) => void;
}) {
  const [query, setQuery] = useState('');

  const tree = useMemo<TreeItem[]>(
    () => [
      {
        type: 'folder',
        name: 'src',
        children: [
          { type: 'file', name: 'App.tsx' },
          { type: 'file', name: 'styles.css' },
        ],
      },
      { type: 'file', name: 'README.md' },
    ],
    []
  );

  return (
    <aside className="w-72 bg-card border-r border-border flex flex-col min-w-[220px]">
      <div className="h-11 px-3 border-b border-border flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          {view === 'explorer' ? 'Explorer' : 'Search'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {view === 'explorer' && (
            <>
              <button
                className="h-8 w-8 rounded-md hover:bg-muted/40 flex items-center justify-center"
                title="New file"
              >
                <FilePlus className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                className="h-8 w-8 rounded-md hover:bg-muted/40 flex items-center justify-center"
                title="New folder"
              >
                <FolderPlus className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                className="h-8 w-8 rounded-md hover:bg-muted/40 flex items-center justify-center"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {view === 'search' && (
        <div className="p-3 border-b border-border">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className="w-full h-9 rounded-md bg-muted/30 border border-border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
      )}

      <div className="flex-1 overflow-auto p-2">
        {view === 'search' ? (
          <div className="text-xs text-muted-foreground px-2 py-3">
            Type to search (mock UI).
          </div>
        ) : (
          <Tree items={tree} onSelectFile={onSelectFile} />
        )}
      </div>
    </aside>
  );
}

function Tree({
  items,
  onSelectFile,
  depth = 0,
}: {
  items: TreeItem[];
  onSelectFile: (fileName: string) => void;
  depth?: number;
}) {
  return (
    <div className="space-y-0.5">
      {items.map((item) => {
        if (item.type === 'file') {
          return (
            <button
              key={`${depth}:${item.name}`}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/40 text-sm text-left"
              onClick={() => onSelectFile(item.name)}
            >
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="truncate">{item.name}</span>
            </button>
          );
        }

        return (
          <div key={`${depth}:${item.name}`}>
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
              <Folder className="h-4 w-4" />
              <span className="truncate">{item.name}</span>
            </div>
            <div className="pl-4">
              <Tree items={item.children} onSelectFile={onSelectFile} depth={depth + 1} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
