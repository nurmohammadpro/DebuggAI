'use client';

import { ChevronRight, X } from 'lucide-react';
import { ErrorConsole } from '@/components/web-builder/error-console';
import { WorkspaceGitPanel } from '@/components/workspace/workspace-git-panel';
import { WorkspaceEnvPanel } from '@/components/workspace/workspace-env-panel';
import { WorkspaceConnectionsPanel } from '@/components/workspace/workspace-connections-panel';
import { WorkspaceEditor } from '@/components/workspace/workspace-editor';
import { WorkspaceFileTree } from '@/components/workspace/workspace-file-tree';
import type { EditorView } from '@/components/workspace/workspace-editor';

export type WorkspaceRightTab =
  | 'code'
  | 'preview'
  | 'files'
  | 'console'
  | 'git'
  | 'env'
  | 'connections';

interface WorkspaceRightPanelProps {
  activeTab: WorkspaceRightTab;
  onTabChange: (tab: WorkspaceRightTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  width: number;
  mobile?: boolean;
  onMobileClose?: () => void;
  onEditorViewChange?: (view: EditorView) => void;
}

export function WorkspaceRightPanel({
  activeTab,
  collapsed,
  onToggleCollapsed,
  width,
  mobile = false,
  onMobileClose,
  onEditorViewChange,
}: WorkspaceRightPanelProps) {
  const title = {
    code: 'Code',
    preview: 'Preview',
    files: 'Files',
    console: 'Console',
    git: 'Git',
    env: 'Environment',
    connections: 'Connections',
  }[activeTab];
  const contentWidth = mobile ? 360 : width;

  const panelContent = (
    <>
      <div className="h-11 border-b border-[var(--app-border)] flex items-center justify-between px-3 shrink-0">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text)]">
          {title}
        </h2>
        <button
          className="h-8 w-8 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors"
          title={mobile ? 'Close' : 'Collapse panel'}
          onClick={mobile ? onMobileClose : onToggleCollapsed}
        >
          {mobile ? (
            <X className="h-4 w-4 text-[var(--app-text-dim)]" />
          ) : (
            <ChevronRight className="h-4 w-4 rotate-180 text-[var(--app-text-dim)]" />
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'code' && (
          <WorkspaceEditor
            editorView="code"
            onEditorViewChange={onEditorViewChange}
          />
        )}

        {activeTab === 'preview' && (
          <WorkspaceEditor
            editorView="preview"
            onEditorViewChange={onEditorViewChange}
          />
        )}

        {activeTab === 'files' && (
          <WorkspaceFileTree view="explorer" width={contentWidth} />
        )}

        {activeTab === 'console' && (
          <div className="h-full">
            <ErrorConsole chromeless className="h-full" />
          </div>
        )}

        {activeTab === 'git' && (
          <WorkspaceGitPanel />
        )}

        {activeTab === 'env' && (
          <WorkspaceEnvPanel />
        )}

        {activeTab === 'connections' && (
          <WorkspaceConnectionsPanel />
        )}
      </div>
    </>
  );

  if (collapsed) {
    return (
      <aside className="w-10 bg-[var(--app-panel)] flex items-center justify-center">
        <button
          className="h-8 w-8 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors"
          title="Expand panel"
          onClick={onToggleCollapsed}
        >
          <ChevronRight className="h-4 w-4 text-[var(--app-text-dim)]" />
        </button>
      </aside>
    );
  }

  if (mobile) {
    return (
      <aside className="fixed inset-x-0 top-12 bottom-14 bg-[var(--app-panel)] flex flex-col z-50 sm:hidden">
        {panelContent}
      </aside>
    );
  }

  return (
    <aside
      className="bg-[var(--app-panel)] border-l border-[var(--app-border)] flex flex-col min-w-[320px]"
      style={{ width }}
    >
      {panelContent}
    </aside>
  );
}
