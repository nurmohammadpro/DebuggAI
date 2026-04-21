'use client';

import {
  Folder,
  Search,
  GitBranch,
  Bug,
  Plug,
  Settings,
} from 'lucide-react';

export type WorkspaceLeftView = 'explorer' | 'search';
export type WorkspaceRightTab =
  | 'chat'
  | 'preview'
  | 'console'
  | 'git'
  | 'env'
  | 'connections';

export function WorkspaceIconSidebar({
  leftView,
  onLeftViewChange,
  onRightTabChange,
}: {
  leftView: WorkspaceLeftView;
  onLeftViewChange: (view: WorkspaceLeftView) => void;
  onRightTabChange: (tab: WorkspaceRightTab) => void;
}) {
  const itemBase =
    'h-10 w-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/40 transition';
  const itemActive = 'bg-muted/50 text-foreground border border-border';

  return (
    <nav className="w-12 bg-card border-r border-border flex flex-col items-center py-2 gap-1">
      <button
        className={`${itemBase} ${leftView === 'explorer' ? itemActive : ''}`}
        title="Explorer"
        onClick={() => onLeftViewChange('explorer')}
      >
        <Folder className="h-4 w-4" />
      </button>
      <button
        className={`${itemBase} ${leftView === 'search' ? itemActive : ''}`}
        title="Search"
        onClick={() => onLeftViewChange('search')}
      >
        <Search className="h-4 w-4" />
      </button>

      <div className="my-1 h-px w-8 bg-border" />

      <button
        className={itemBase}
        title="Source Control"
        onClick={() => onRightTabChange('git')}
      >
        <GitBranch className="h-4 w-4" />
      </button>
      <button
        className={itemBase}
        title="Debug"
        onClick={() => onRightTabChange('console')}
      >
        <Bug className="h-4 w-4" />
      </button>

      <div className="my-1 h-px w-8 bg-border" />

      <button
        className={itemBase}
        title="Connections"
        onClick={() => onRightTabChange('connections')}
      >
        <Plug className="h-4 w-4" />
      </button>
      <button
        className={itemBase}
        title="Environment"
        onClick={() => onRightTabChange('env')}
      >
        <Settings className="h-4 w-4" />
      </button>
    </nav>
  );
}

