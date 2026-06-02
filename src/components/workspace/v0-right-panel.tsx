'use client';

import { Code2, Eye, Play, Rocket, Share2, Save, PanelRightClose, PanelRightOpen, Maximize2, Minimize2, RefreshCw, Loader2, Container, Terminal } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkspaceEditor } from '@/components/workspace/workspace-editor';
import type { EditorView } from '@/components/workspace/workspace-editor';
import { EnhancedPreviewPane } from '@/components/web-builder/enhanced-preview-pane';
import { useGenerationStore } from '@/store/generation-store';
import { useSandbox } from '@/hooks/use-sandbox';
import { cn } from '@/lib/utils';
import { serializeVirtualFiles } from '@/lib/project/virtual-files';

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
  const { bumpPreviewNonce, files } = useGenerationStore();
  const sandbox = useSandbox();
  const lastFileSnapshot = useRef<string>('');

  // Use Docker as primary preview: auto-create sandbox when entering preview mode
  // or when files change significantly
  useEffect(() => {
    if (activeView !== 'preview') return;
    if (!files || Object.keys(files.files).length === 0) return;

    const snapshot = serializeVirtualFiles(files);
    if (snapshot === lastFileSnapshot.current) return;
    lastFileSnapshot.current = snapshot;

    // Build a flat file record for the sandbox
    const flatFiles: Record<string, string> = {};
    for (const [path, file] of Object.entries(files.files)) {
      if (file.status === 'deleted') continue;
      flatFiles[path] = file.content;
    }

    // Only re-create if we have meaningful content
    const totalChars = Object.values(flatFiles).reduce((sum, c) => sum + c.length, 0);
    if (totalChars < 20) return;

    // If sandbox already exists and is running, just pass the new files
    if (sandbox.status === 'running' || sandbox.status === 'installing') {
      return;
    }

    sandbox.createSandbox(flatFiles);
  }, [activeView, files, sandbox.createSandbox, sandbox.status]);

  const handleRefresh = useCallback(() => {
    bumpPreviewNonce();
    // Re-create sandbox on refresh if it's stopped
    if (sandbox.status === 'stopped' || sandbox.status === 'error') {
      if (!files || Object.keys(files.files).length === 0) return;
      const flatFiles: Record<string, string> = {};
      for (const [path, file] of Object.entries(files.files)) {
        if (file.status === 'deleted') continue;
        flatFiles[path] = file.content;
      }
      sandbox.createSandbox(flatFiles);
    }
  }, [bumpPreviewNonce, sandbox, files]);

  const previewEngine =
    sandbox.status === 'creating' ? 'docker-creating' :
    sandbox.status === 'installing' ? 'docker-installing' :
    sandbox.status === 'running' ? 'docker' :
    sandbox.status === 'error' && sandbox.error?.includes('Docker') ? 'sandpack' :
    sandbox.status === 'error' ? 'sandpack' :
    sandbox.status === 'stopped' ? 'sandpack' :
    sandbox.previewUrl ? 'docker' :
    files && Object.keys(files.files).length > 1 ? 'sandpack' :
    'idle';

  const showDockerPreview = previewEngine === 'docker' || previewEngine === 'docker-installing' || previewEngine === 'docker-creating';

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

        {/* Engine badge */}
        {activeView === 'preview' && (
          <span className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ml-1',
            previewEngine === 'docker' && 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
            previewEngine === 'docker-creating' && 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
            previewEngine === 'docker-installing' && 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
            previewEngine === 'sandpack' && 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
          )}>
            {previewEngine === 'docker-creating' || previewEngine === 'docker-installing' ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : previewEngine === 'docker' ? (
              <Container className="h-2.5 w-2.5" />
            ) : previewEngine === 'sandpack' ? (
              <Terminal className="h-2.5 w-2.5" />
            ) : null}
            {previewEngine === 'docker-creating' ? 'Starting...' :
             previewEngine === 'docker-installing' ? 'Building...' :
             previewEngine === 'docker' ? 'Docker' :
             previewEngine === 'sandpack' ? 'Sandpack' : 'Idle'}
          </span>
        )}

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
            forceSandbox={showDockerPreview}
            sandboxUrl={sandbox.previewUrl}
            sandboxError={sandbox.error}
            onRefresh={handleRefresh}
          />
        )}
      </div>
    </div>
  );
}
