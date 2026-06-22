'use client';

import {
  Code2,
  Eye,
  GitBranch,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Rocket,
  Save,
  Share2,
  Zap,
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { WorkspaceEditor } from '@/components/workspace/workspace-editor';
import { BrowserPreview } from '@/components/preview/browser-preview';
import { DiffTimeline } from '@/components/workspace/diff-timeline';
import { useGenerationStore } from '@/store/generation-store';
import { cn } from '@/lib/utils';

export type V0RightView = 'preview' | 'code' | 'changes';

interface V0RightPanelProps {
  activeView: V0RightView;
  onViewChange: (view: V0RightView) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onDeploy?: () => void;
  onShare?: () => void;
  onSave?: () => void;
  sandboxUrl?: string | null;
  sandboxStatus?: 'idle' | 'creating' | 'installing' | 'running' | 'error' | 'stopped';
}

/**
 * v0.dev-style right panel — Sandpack instant preview + code editor.
 * Preview is the default view. Code shows the file tree + Monaco.
 */
export function V0RightPanel({
  activeView,
  onViewChange,
  collapsed = false,
  onToggleCollapsed,
  onDeploy,
  onShare,
  onSave,
  sandboxUrl,
  sandboxStatus,
}: V0RightPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { bumpPreviewNonce, files } = useGenerationStore();
  const handleRefresh = useCallback(() => {
    bumpPreviewNonce();
  }, [bumpPreviewNonce]);

  const hasFiles = files && Object.keys(files.files).filter(p => files.files[p]?.status !== 'deleted').length > 0;

  return (
    <div className={cn('flex flex-col h-full bg-[var(--app-bg)]', isFullscreen && 'fixed inset-0 z-50')}>
      {/* Header */}
      <div className="h-11 flex items-center gap-1.5 px-3 shrink-0 border-b border-[var(--app-border)] bg-[var(--app-panel)]">
        {/* Preview/Code toggle */}
        <div className="flex items-center bg-[var(--app-surface)] rounded-[7px] p-0.5 border border-[var(--app-border)]">
          <button
            onClick={() => onViewChange('preview')}
            className={cn('h-7 px-3 rounded-[5px] flex items-center gap-1.5 text-[11px] font-medium transition-colors',
              activeView === 'preview' ? 'bg-[var(--app-panel)] text-[var(--app-text)] shadow-sm' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]')}
          >
            <Eye className="h-3.5 w-3.5" /> Preview
          </button>
          <button
            onClick={() => onViewChange('code')}
            className={cn('h-7 px-3 rounded-[5px] flex items-center gap-1.5 text-[11px] font-medium transition-colors',
              activeView === 'code' ? 'bg-[var(--app-panel)] text-[var(--app-text)] shadow-sm' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]')}
          >
            <Code2 className="h-3.5 w-3.5" /> Code
          </button>
          <button
            onClick={() => onViewChange('changes')}
            className={cn('h-7 px-3 rounded-[5px] flex items-center gap-1.5 text-[11px] font-medium transition-colors',
              activeView === 'changes' ? 'bg-[var(--app-panel)] text-[var(--app-text)] shadow-sm' : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]')}
          >
            <GitBranch className="h-3.5 w-3.5" /> Changes
          </button>
        </div>

        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Zap className="h-2.5 w-2.5" /> Instant
        </span>

        <div className="flex-1" />

        {hasFiles && (
          <>
            <button onClick={handleRefresh} className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors" title="Refresh preview">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setIsFullscreen(!isFullscreen)} className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </button>
          </>
        )}

        <div className="w-px h-5 bg-[var(--app-border)] mx-0.5" />

        {onSave && (
          <button onClick={onSave} className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors" title="Save">
            <Save className="h-3.5 w-3.5" />
          </button>
        )}
        {onShare && (
          <button onClick={onShare} className="h-7 px-2.5 rounded-[6px] flex items-center gap-1.5 text-[11px] font-semibold border border-[var(--app-border)] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors" title="Share">
            <Share2 className="h-3.5 w-3.5" /> Share
          </button>
        )}
        {onDeploy && (
          <button onClick={onDeploy} className="h-7 px-2.5 rounded-[6px] flex items-center gap-1.5 text-[11px] font-semibold uppercase bg-[var(--app-accent)] text-white hover:opacity-90 transition-opacity" title="Deploy">
            <Rocket className="h-3.5 w-3.5" /> Deploy
          </button>
        )}
        {onToggleCollapsed && (
          <button onClick={onToggleCollapsed} className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors" title={collapsed ? 'Show panel' : 'Hide panel'}>
            {collapsed ? <PanelRightOpen className="h-3.5 w-3.5" /> : <PanelRightClose className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      {/* Content — both panels stay mounted so switching views is instant and
           the editor/iframe state is preserved. */}
      <div className="flex-1 min-h-0 relative">
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            visibility: activeView === 'preview' ? 'visible' : 'hidden',
            pointerEvents: activeView === 'preview' ? 'auto' : 'none',
          }}
          aria-hidden={activeView !== 'preview'}
        >
          <BrowserPreview
            className="flex-1 min-h-0 border-0 rounded-none"
            chromeless
            sandboxUrl={sandboxUrl}
            sandboxStatus={sandboxStatus}
          />
        </div>
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            visibility: activeView === 'code' ? 'visible' : 'hidden',
            pointerEvents: activeView === 'code' ? 'auto' : 'none',
          }}
          aria-hidden={activeView !== 'code'}
        >
          <WorkspaceEditor
            editorView="code"
            showToolbar={false}
            showFileTree
            onEditorViewChange={(view) => onViewChange(view as V0RightView)}
          />
        </div>
        <div
          className="absolute inset-0 flex flex-col"
          style={{
            visibility: activeView === 'changes' ? 'visible' : 'hidden',
            pointerEvents: activeView === 'changes' ? 'auto' : 'none',
          }}
          aria-hidden={activeView !== 'changes'}
        >
          <DiffTimeline />
        </div>
      </div>
    </div>
  );
}
