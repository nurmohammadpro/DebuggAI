'use client';

import { X, LayoutPanelTop, Database, Code2, Eye, Files, Terminal, Plug } from 'lucide-react';
import { ErrorConsole } from '@/components/web-builder/error-console';
import { WorkspaceConnectionsPanel } from '@/components/workspace/workspace-connections-panel';
import { WorkspaceEditor } from '@/components/workspace/workspace-editor';
import { WorkspaceFileTree } from '@/components/workspace/workspace-file-tree';
import { VisualEditor } from '@/components/visual-editor/visual-editor';
import { SchemaGenerator } from '@/components/schema-generator/schema-generator';
import type { EditorView } from '@/components/workspace/workspace-editor';

export type WorkspaceRightTab =
  | 'code'
  | 'preview'
  | 'files'
  | 'console'
  | 'connections'
  | 'visual'
  | 'schema';

interface WorkspaceRightPanelProps {
  activeTab: WorkspaceRightTab;
  onTabChange: (tab: WorkspaceRightTab) => void;
  width: number;
  mobile?: boolean;
  onMobileClose?: () => void;
  onToggleCollapsed?: () => void;
  onEditorViewChange?: (view: EditorView) => void;
}

export function WorkspaceRightPanel({
  activeTab,
  onTabChange,
  width,
  mobile = false,
  onMobileClose,
  onToggleCollapsed,
  onEditorViewChange,
}: WorkspaceRightPanelProps) {
  const contentWidth = mobile ? 360 : width;
  const tabs: Array<{ id: WorkspaceRightTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'code', label: 'Code', icon: Code2 },
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'files', label: 'Files', icon: Files },
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'connections', label: 'Connect', icon: Plug },
    { id: 'visual', label: 'Visual', icon: LayoutPanelTop },
    { id: 'schema', label: 'Schema', icon: Database },
  ];

  return (
    <>
      <div className="h-11 px-2 flex items-center gap-1 overflow-x-auto shrink-0">
        {tabs.map((t) => {
          const Icon = t.icon;
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => onTabChange(t.id)}
              className={`shrink-0 h-8 px-2.5 rounded-[7px] inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)]'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] border border-transparent'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={t.label}
              title={t.label}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-[var(--app-text)]' : ''}`} />
              <span className="hidden lg:inline">{t.label}</span>
            </button>
          );
        })}
        {mobile && onMobileClose && (
          <button
            className="ml-auto h-8 w-8 rounded-[7px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors shrink-0"
            title="Close"
            onClick={onMobileClose}
          >
            <X className="h-4 w-4 text-[var(--app-text-muted)]" />
          </button>
        )}
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
}
