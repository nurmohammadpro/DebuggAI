'use client';

import { useState } from 'react';
import { RefreshCw, FilePlus, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';

import type { WorkspaceLeftView } from './workspace-icon-sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { WorkspaceFileTreeView } from '@/components/workspace/workspace-file-tree-view';
import { WorkspaceVersionsList } from '@/components/workspace/workspace-versions-list';
import { useGenerationStore } from '@/store/generation-store';
import { useWorkspaceStore } from '@/store/workspace-store';

export function WorkspaceFileTree({
  view,
  width,
}: {
  view: WorkspaceLeftView;
  width: number;
}) {
  const [query, setQuery] = useState('');
  const { selectedProjectId, projectKey } = useWorkspaceStore();

  const handleNewFile = () => {
    const name = window.prompt('File name:');
    if (!name) return;

    const state = useGenerationStore.getState();
    if (!state.files) {
      toast.error('No project files loaded');
      return;
    }

    const path = name.includes('/') ? name : `src/${name}`;
    if (state.files.files[path]) {
      toast.error('File already exists');
      return;
    }

    useGenerationStore.setState({
      files: {
        ...state.files,
        files: {
          ...state.files.files,
          [path]: { path, content: '', status: 'added' as const },
        },
      },
      activeFilePath: path,
    });
  };

  const handleNewFolder = () => {
    const name = window.prompt('Folder name:');
    if (!name) return;

    const state = useGenerationStore.getState();
    if (!state.files) {
      toast.error('No project files loaded');
      return;
    }

    const folderPath = name.endsWith('/') ? name : `${name}/`;
    const markerPath = `${folderPath}.gitkeep`;

    if (state.files.files[markerPath]) {
      toast.error('Folder already exists');
      return;
    }

    useGenerationStore.setState({
      files: {
        ...state.files,
        files: {
          ...state.files.files,
          [markerPath]: { path: markerPath, content: '', status: 'added' as const },
        },
      },
    });
  };

  const handleRefresh = () => {
    // Reload from project data
    if (!selectedProjectId) return;
    const state = useGenerationStore.getState();
    if (state.currentProjectId === selectedProjectId && state.files) {
      // Already loaded — just trigger a re-render
      useGenerationStore.setState({ files: { ...state.files } });
    }
  };

  return (
    <aside
      className="bg-[var(--app-panel)] flex flex-col min-w-[220px]"
      style={{ width }}
    >
      <div className="h-11 px-3 border-b border-[var(--app-border)] flex items-center gap-2">
        <span className="text-xs font-semibold tracking-wide text-[var(--app-text-muted)]">
          {view === 'explorer' ? 'Explorer' : 'Search'}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {view === 'explorer' && (
            <>
              <button
                className="h-8 w-8 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors"
                title="New file"
                onClick={handleNewFile}
              >
                <FilePlus className="h-4 w-4 text-[var(--app-text-dim)]" />
              </button>
              <button
                className="h-8 w-8 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors"
                title="New folder"
                onClick={handleNewFolder}
              >
                <FolderPlus className="h-4 w-4 text-[var(--app-text-dim)]" />
              </button>
              <button
                className="h-8 w-8 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors"
                title="Refresh"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 text-[var(--app-text-dim)]" />
              </button>
            </>
          )}
        </div>
      </div>

      {view === 'search' && (
        <div className="p-3 border-b border-[var(--app-border)]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files..."
            className="w-full h-9 rounded-[8px] bg-[var(--app-panel-2)] border-0 px-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20"
          />
        </div>
      )}

      <div className="flex-1 overflow-auto p-2">
        {view === 'search' ? (
          <WorkspaceFileTreeView query={query} />
        ) : (
          <Tabs defaultValue="files" className="gap-2">
            <TabsList variant="line" className="bg-transparent px-1 gap-0.5">
              <TabsTrigger value="files" className="h-8 rounded-[6px] text-[11px]">
                Files
              </TabsTrigger>
              <TabsTrigger value="versions" className="h-8 rounded-[6px] text-[11px]">
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
