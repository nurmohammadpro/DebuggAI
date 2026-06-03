'use client';

import { Code2, Eye, Play, Rocket, Share2, Save, PanelRightClose, PanelRightOpen, Maximize2, Minimize2, RefreshCw, Loader2, Container, Terminal, GripHorizontal } from 'lucide-react';
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

/**
 * v0.dev-style right panel with split view:
 * - Preview always visible (primary, top 55%)
 * - Code always visible (secondary, bottom 45%)
 * - Resizable splitter between them
 * - Auto-refresh preview when files change
 */
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
  const hasBootedRef = useRef(false);
  const sandboxRef = useRef(sandbox);
  sandboxRef.current = sandbox;

  // Split position (percentage for preview, code takes the rest)
  const [splitPos, setSplitPos] = useState(55);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-create Docker sandbox when files are available (background)
  useEffect(() => {
    if (!files || Object.keys(files.files).length === 0) return;

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
        sandboxRef.current.createSandbox(flatFiles);
      }).catch(() => {
        sandboxRef.current.createSandbox(flatFiles);
      });
    } else if (sb.status === 'idle' || sb.status === 'stopped' || sb.status === 'error') {
      sb.createSandbox(flatFiles);
    }
  }, [files]);

  // Auto-refresh preview when files change
  const prevFilesRef = useRef<string>('');
  useEffect(() => {
    const currentSnapshot = files ? serializeVirtualFiles(files) : '';
    if (prevFilesRef.current && currentSnapshot !== prevFilesRef.current) {
      // Files changed — bump nonce to refresh preview
      bumpPreviewNonce();
    }
    prevFilesRef.current = currentSnapshot;
  }, [files, bumpPreviewNonce]);

  const handleRefresh = useCallback(() => {
    bumpPreviewNonce();
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

  // Split resize handlers
  const handleMouseDown = useCallback(() => {
    isDragging.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const pct = (y / rect.height) * 100;
      setSplitPos(Math.max(30, Math.min(80, pct)));
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const previewEngine =
    sandbox.status === 'creating' ? 'docker-creating' :
    sandbox.status === 'installing' ? 'docker-installing' :
    sandbox.status === 'running' ? 'docker' :
    sandbox.status === 'error' ? 'error' :
    sandbox.status === 'stopped' ? 'stopped' :
    sandbox.previewUrl ? 'docker' :
    'idle';

  const hasFiles = files && Object.keys(files.files).filter(p => files.files[p]?.status !== 'deleted').length > 0;

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-[var(--app-bg)]',
        isFullscreen && 'fixed inset-0 z-50'
      )}
    >
      {/* Header — minimal, builder-focused */}
      <div className="h-10 flex items-center gap-1.5 px-3 shrink-0 border-b border-[var(--app-border)] bg-[var(--app-panel)]">
        {/* Preview indicator — always visible */}
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'w-1.5 h-1.5 rounded-full',
            previewEngine === 'docker' ? 'bg-emerald-400 animate-pulse' :
            previewEngine === 'docker-creating' || previewEngine === 'docker-installing' ? 'bg-amber-400 animate-pulse' :
            previewEngine === 'error' ? 'bg-rose-400' :
            'bg-zinc-400'
          )} />
          <span className="text-[11px] font-semibold text-[var(--app-text)]">
            {previewEngine === 'docker' ? 'Live Preview' :
             previewEngine === 'docker-creating' ? 'Starting...' :
             previewEngine === 'docker-installing' ? 'Building...' :
             previewEngine === 'error' ? 'Preview Error' :
             previewEngine === 'stopped' ? 'Stopped' : 'Preview'}
          </span>
          {previewEngine === 'docker-creating' || previewEngine === 'docker-installing' ? (
            <Loader2 className="h-3 w-3 text-amber-400 animate-spin" />
          ) : previewEngine === 'docker' ? (
            <Container className="h-3 w-3 text-emerald-400" />
          ) : null}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        {hasFiles && (
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

        <div className="w-px h-5 bg-[var(--app-border)] mx-0.5" />

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

      {/* Split Content: Preview (top) + Code (bottom) — always visible when files exist */}
      <div ref={containerRef} className="flex-1 min-h-0 flex flex-col">
        {!hasFiles ? (
          /* Empty state — no files generated yet */
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div className="max-w-[280px]">
              <Eye className="h-10 w-10 text-[var(--app-text-dim)] mx-auto mb-4 opacity-30" />
              <p className="text-sm text-[var(--app-text)] mb-1 font-medium">Preview</p>
              <p className="text-xs text-[var(--app-text-muted)] leading-relaxed">
                Ask the assistant to generate code and you&apos;ll see the live preview here.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* PREVIEW — top section (55% default) */}
            <div
              className="min-h-0 overflow-hidden"
              style={{ flex: `${splitPos} 1 0` }}
            >
              <EnhancedPreviewPane
                height="100%"
                className="h-full border-0 rounded-none"
                chromeless
                sandboxUrl={sandbox.previewUrl}
                sandboxError={sandbox.error}
                onRefresh={handleRefresh}
              />
            </div>

            {/* Resize Handle */}
            <div
              className="h-2 shrink-0 flex items-center justify-center cursor-row-resize group hover:bg-[var(--app-accent)]/10 transition-colors relative"
              onMouseDown={handleMouseDown}
            >
              <div className="w-8 h-1 rounded-full bg-[var(--app-border)] group-hover:bg-[var(--app-accent)]/40 transition-colors" />
            </div>

            {/* CODE — bottom section (45% default) */}
            <div
              className="min-h-0 overflow-hidden border-t border-[var(--app-border)]"
              style={{ flex: `${100 - splitPos} 1 0` }}
            >
              <WorkspaceEditor
                editorView="code"
                onEditorViewChange={(view) => onViewChange(view as V0RightView)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
