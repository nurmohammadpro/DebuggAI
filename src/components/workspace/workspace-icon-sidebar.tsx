'use client';

import {
  Folder,
  Search,
  GitBranch,
  Bug,
  Plug,
  Settings,
} from 'lucide-react';

import type { WorkspaceRightTab } from './workspace-right-panel';

export type WorkspaceLeftView = 'explorer' | 'search';

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
    'h-10 w-10 rounded-[var(--radius-md)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition';
  const itemActive = 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-default)]';

  return (
    <nav className="w-12 bg-[var(--bg-secondary)] flex flex-col items-center py-2 gap-1">
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

      <div className="my-1 h-px w-8 bg-[var(--border-default)]" />

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

      <div className="my-1 h-px w-8 bg-[var(--border-default)]" />

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
