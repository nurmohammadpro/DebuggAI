'use client';

import { ChevronRight, X, ExternalLink, LayoutPanelTop, Database } from 'lucide-react';
import { ErrorConsole } from '@/components/web-builder/error-console';
import { WorkspaceGitPanel } from '@/components/workspace/workspace-git-panel';
import { WorkspaceConnectionsPanel } from '@/components/workspace/workspace-connections-panel';
import { WorkspaceEditor } from '@/components/workspace/workspace-editor';
import { WorkspaceFileTree } from '@/components/workspace/workspace-file-tree';
import { WorkspaceRunsPanel } from '@/components/workspace/workspace-runs-panel';
import { VisualEditor } from '@/components/visual-editor/visual-editor';
import { SchemaGenerator } from '@/components/schema-generator/schema-generator';
import type { EditorView } from '@/components/workspace/workspace-editor';

export type WorkspaceRightTab =
  | 'code'
  | 'preview'
  | 'files'
  | 'console'
  | 'runs'
  | 'git'
  | 'env'
  | 'connections'
  | 'visual'
  | 'schema';

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
    runs: 'Runs',
    git: 'Git',
    env: 'Environment',
    connections: 'Connections',
    visual: 'Visual Editor',
    schema: 'Schema Generator',
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
        <div key={activeTab} className="h-full min-h-0 animate-in fade-in slide-in-from-right-2 duration-200 fill-mode-both">
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

          {activeTab === 'runs' && (
            <WorkspaceRunsPanel />
          )}

          {activeTab === 'git' && (
            <WorkspaceGitPanel />
          )}

          {activeTab === 'env' && (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <ExternalLink className="h-8 w-8 text-[var(--app-text-dim)] mb-3" />
              <div className="text-[13px] font-medium text-[var(--app-text)] mb-1">Environment Variables</div>
              <div className="text-[11px] text-[var(--app-text-muted)] max-w-[260px]">
                Manage environment variables from the project settings page for secure, server-persisted storage.
              </div>
            </div>
          )}

          {activeTab === 'connections' && (
            <WorkspaceConnectionsPanel />
          )}

          {activeTab === 'visual' && (
            <VisualEditor className="h-full" />
          )}

          {activeTab === 'schema' && (
            <SchemaGenerator />
          )}
        </div>
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
      className="bg-[var(--app-panel)] border-l border-[var(--app-border)] flex flex-col min-w-[320px] min-h-0 h-full"
      style={{ width }}
    >
      {panelContent}
    </aside>
  );
}
