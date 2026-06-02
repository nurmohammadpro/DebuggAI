'use client';

import {
  Code2,
  Eye,
  Play,
  Rocket,
  Share2,
  Save,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { WorkspaceEditor } from '@/components/workspace/workspace-editor';
import type { EditorView } from '@/components/workspace/workspace-editor';
import { EnhancedPreviewPane } from '@/components/web-builder/enhanced-preview-pane';
import { useGenerationStore } from '@/store/generation-store';
import { useSandbox } from '@/hooks/use-sandbox';
import { cn } from '@/lib/utils';

export type V0RightView = 'code' | 'preview';

interface V0RightPanelProps {
  activeView: V0RightView;
  onViewChange: (view: V0RightView) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onRun?: () => void;
  onDeploy?: () => void;
  onShare?: () => void;
  onSave?: () => void;
}

export function V0RightPanel({
  activeView,
  onViewChange,
  collapsed = false,
  onToggleCollapsed,
  onRun,
  onDeploy,
  onShare,
  onSave,
}: V0RightPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { bumpPreviewNonce } = useGenerationStore();
  const sandbox = useSandbox();

  const handleRefresh = () => {
    bumpPreviewNonce();
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[var(--app-bg)]',
        isFullscreen && 'fixed inset-0 z-50'
      )}
    >
      {/* Header */}
      <div className="h-11 flex items-center gap-1.5 px-3 shrink-0 border-b border-[var(--app-border)] bg-[var(--app-panel)]">
        {/* Code/Preview toggle */}
        <div className="flex items-center bg-[var(--app-surface)] rounded-[7px] p-0.5 border border-[var(--app-border)]">
          <button
            onClick={() => onViewChange('code')}
            className={cn(
              'h-7 px-3 rounded-[5px] flex items-center gap-1.5 text-[11px] font-medium transition-colors',
              activeView === 'code'
                ? 'bg-[var(--app-panel)] text-[var(--app-text)] shadow-sm'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            )}
          >
            <Code2 className="h-3.5 w-3.5" />
            Code
          </button>
          <button
            onClick={() => onViewChange('preview')}
            className={cn(
              'h-7 px-3 rounded-[5px] flex items-center gap-1.5 text-[11px] font-medium transition-colors',
              activeView === 'preview'
                ? 'bg-[var(--app-panel)] text-[var(--app-text)] shadow-sm'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            )}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        {activeView === 'preview' && (
          <>
            <button
              onClick={handleRefresh}
              className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
              title="Refresh preview"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </button>
          </>
        )}

        <div className="w-px h-5 bg-[var(--app-border)] mx-1" />

        {onRun && (
          <button
            onClick={onRun}
            className="h-7 px-2.5 rounded-[6px] flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-tight bg-[var(--app-accent)] text-white hover:opacity-90 transition-opacity"
            title="Run"
          >
            <Play className="h-3.5 w-3.5" />
            Run
          </button>
        )}

        {onSave && (
          <button
            onClick={onSave}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            title="Save version"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
        )}

        {onShare && (
          <button
            onClick={onShare}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            title="Share"
          >
            <Share2 className="h-3.5 w-3.5" />
          </button>
        )}

        {onDeploy && (
          <button
            onClick={onDeploy}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            title="Deploy"
          >
            <Rocket className="h-3.5 w-3.5" />
          </button>
        )}

        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            title={collapsed ? 'Show panel' : 'Hide panel'}
          >
            {collapsed ? (
              <PanelRightOpen className="h-3.5 w-3.5" />
            ) : (
              <PanelRightClose className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {activeView === 'code' && (
          <WorkspaceEditor
            editorView="code"
            onEditorViewChange={(view) => onViewChange(view as V0RightView)}
          />
        )}

        {activeView === 'preview' && (
          <EnhancedPreviewPane
            height="100%"
            className="h-full border-0 rounded-none"
            chromeless
            forceSandbox={!!sandbox.previewUrl}
            sandboxUrl={sandbox.previewUrl}
            sandboxError={sandbox.error}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
}
