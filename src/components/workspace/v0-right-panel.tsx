'use client';

import {
  Code2,
  Eye,
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
import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkspaceEditor } from '@/components/workspace/workspace-editor';
import { EnhancedPreviewPane } from '@/components/web-builder/enhanced-preview-pane';
import { useGenerationStore } from '@/store/generation-store';
import { useSandbox } from '@/hooks/use-sandbox';
import { cn } from '@/lib/utils';
import { serializeVirtualFiles } from '@/lib/project/virtual-files';

export type V0RightView = 'preview' | 'code';

interface V0RightPanelProps {
  activeView: V0RightView;
  onViewChange: (view: V0RightView) => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onDeploy?: () => void;
  onShare?: () => void;
  onSave?: () => void;
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
}: V0RightPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewEverActivated, setPreviewEverActivated] = useState(false);
  const [codeEverActivated, setCodeEverActivated] = useState(false);
  const { bumpPreviewNonce, files } = useGenerationStore();
  const sandbox = useSandbox();
  const lastFileSnapshot = useRef<string>('');
  const hasBootedRef = useRef(false);
  const sandboxRef = useRef(sandbox);
  const dockerUnavailableRef = useRef(false);

  useEffect(() => { sandboxRef.current = sandbox; }, [sandbox]);

  // Track first activation of each view — defer heavy init until needed
  useEffect(() => {
    if (activeView === 'preview' && !previewEverActivated) setPreviewEverActivated(true);
    if (activeView === 'code' && !codeEverActivated) setCodeEverActivated(true);
  }, [activeView, previewEverActivated, codeEverActivated]);

  // Docker sandbox — best-effort background only, deferred until preview first activated
  useEffect(() => {
    if (!previewEverActivated) return;
    if (!files || Object.keys(files.files).length === 0) return;
    if (dockerUnavailableRef.current) return;

    const snapshot = serializeVirtualFiles(files);
    if (snapshot === lastFileSnapshot.current && hasBootedRef.current) return;
    lastFileSnapshot.current = snapshot;
    hasBootedRef.current = true;

    const flatFiles: Record<string, string> = {};
    for (const [path, file] of Object.entries(files.files)) {
      if (file.status === 'deleted') continue;
      flatFiles[path] = file.content;
    }

    const totalChars = Object.values(flatFiles).reduce((sum, c) => sum + c.length, 0);
    if (totalChars < 20) return;

    const sb = sandboxRef.current;
    if (sb.status === 'running' || sb.status === 'installing') {
      sb.stopSandbox().then(() => {
        sandboxRef.current.createSandbox(flatFiles).then(id => {
          if (!id) dockerUnavailableRef.current = true;
        });
      }).catch(() => { dockerUnavailableRef.current = true; });
    } else if (sb.status === 'idle' || sb.status === 'stopped' || sb.status === 'error') {
      sb.createSandbox(flatFiles).then(id => {
        if (!id) dockerUnavailableRef.current = true;
      });
    }
  }, [files, previewEverActivated]);

  const handleRefresh = useCallback(() => {
    bumpPreviewNonce();
    if (dockerUnavailableRef.current) return;
    if (sandbox.status === 'stopped' || sandbox.status === 'error') {
      if (!files || Object.keys(files.files).length === 0) return;
      const flatFiles: Record<string, string> = {};
      for (const [path, file] of Object.entries(files.files)) {
        if (file.status === 'deleted') continue;
        flatFiles[path] = file.content;
      }
      sandbox.createSandbox(flatFiles).then(id => {
        if (!id) dockerUnavailableRef.current = true;
      });
    }
  }, [bumpPreviewNonce, sandbox, files]);

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

      {/* Content — both panels mount once activated and stay in DOM.
           visibility: hidden preserves iframe/editor state across tab switches. */}
      <div className="flex-1 min-h-0 relative">
        {!previewEverActivated && !codeEverActivated && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--app-bg)]">
            <span className="text-[11px] text-[var(--app-text-dim)]">
              Select a view to begin
            </span>
          </div>
        )}
        {previewEverActivated && (
          <div
            className="absolute inset-0 flex flex-col"
            style={{
              visibility: activeView === 'preview' ? 'visible' : 'hidden',
              pointerEvents: activeView === 'preview' ? 'auto' : 'none',
            }}
            aria-hidden={activeView !== 'preview'}
          >
            <EnhancedPreviewPane
              height="100%"
              className="flex-1 min-h-0 border-0 rounded-none"
              chromeless
              sandboxUrl={sandbox.previewUrl}
              sandboxError={sandbox.error}
              onRefresh={handleRefresh}
            />
          </div>
        )}
        {codeEverActivated && (
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
        )}
      </div>
    </div>
  );
}
