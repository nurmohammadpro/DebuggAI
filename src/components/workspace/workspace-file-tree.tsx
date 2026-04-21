'use client';

import { useState } from 'react';
import { RefreshCw, FilePlus, FolderPlus } from 'lucide-react';

import type { WorkspaceLeftView } from './workspace-icon-sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspaceFileTreeView } from '@/components/workspace/workspace-file-tree-view';
import { WorkspaceVersionsList } from '@/components/workspace/workspace-versions-list';

export function WorkspaceFileTree({
  view,
  width,
}: {
  view: WorkspaceLeftView;
  width: number;
}) {
  const [query, setQuery] = useState('');

  return (
    <aside
      className="bg-card flex flex-col min-w-[220px]"
      style={{ width }}
    >
      <div className="h-11 px-3 border-b border-border/40 flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground">
          {view === 'explorer' ? 'Explorer' : 'Search'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {view === 'explorer' && (
            <>
              <button
                className="h-8 w-8 rounded-md hover:bg-muted/40 flex items-center justify-center"
                title="New file"
                disabled
              >
                <FilePlus className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                className="h-8 w-8 rounded-md hover:bg-muted/40 flex items-center justify-center"
                title="New folder"
                disabled
              >
                <FolderPlus className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                className="h-8 w-8 rounded-md hover:bg-muted/40 flex items-center justify-center"
                title="Refresh"
                disabled
              >
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {view === 'search' && (
        <div className="p-3 border-b border-border/40">
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
          <WorkspaceFileTreeView query={query} />
        ) : (
          <Tabs defaultValue="files" className="gap-2">
            <TabsList variant="line" className="rounded-none bg-transparent px-1">
              <TabsTrigger value="files" className="h-8 rounded-none text-xs">
                Files
              </TabsTrigger>
              <TabsTrigger value="versions" className="h-8 rounded-none text-xs">
                Versions
              </TabsTrigger>
            </TabsList>
            <TabsContent value="files">
              <WorkspaceFileTreeView />
            </TabsContent>
            <TabsContent value="versions">
              <WorkspaceVersionsList />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </aside>
  );
}
