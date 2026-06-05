'use client';

import {
  AlertTriangle,
  Code2,
  Container,
  Database,
  Eye,
  Loader2,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  Play,
  Plug,
  RefreshCw,
  Rocket,
  Save,
  Share2,
  Terminal,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { WorkspaceEditor } from '@/components/workspace/workspace-editor';
import { EnhancedPreviewPane } from '@/components/web-builder/enhanced-preview-pane';
import { useGenerationStore } from '@/store/generation-store';
import { useSandbox } from '@/hooks/use-sandbox';
import { cn } from '@/lib/utils';
import { serializeVirtualFiles } from '@/lib/project/virtual-files';
import { WorkspaceConnectionsPanel } from '@/components/workspace/workspace-connections-panel';
import { SchemaGenerator } from '@/components/schema-generator/schema-generator';
import { useBuildVerification } from '@/hooks/use-build-verification';

export type V0RightView =
  | 'preview'
  | 'code'
  | 'console'
  | 'connections'
  | 'schema';

const WORKSPACE_TABS: Array<{
  id: V0RightView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'preview', label: 'Preview', icon: Eye },
  { id: 'code', label: 'Code', icon: Code2 },
  { id: 'console', label: 'Console', icon: Terminal },
  { id: 'connections', label: 'Connect', icon: Plug },
  { id: 'schema', label: 'Schema', icon: Database },
];

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
 * v0.dev-style right panel with one clear surface at a time.
 * New users see either Preview or Code, not a stacked IDE maze.
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
  const { bumpPreviewNonce, files, activeFilePath } = useGenerationStore();
  const sandbox = useSandbox();
  const lastFileSnapshot = useRef<string>('');
  const hasBootedRef = useRef(false);
  const sandboxRef = useRef(sandbox);

  useEffect(() => {
    sandboxRef.current = sandbox;
  }, [sandbox]);

  // Auto-create Docker sandbox when files are available (background — best-effort only)
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
      }).catch(() => {});
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

  const previewEngine =
    sandbox.status === 'creating' ? 'docker-creating' :
    sandbox.status === 'installing' ? 'docker-installing' :
    sandbox.status === 'running' ? 'docker' :
    sandbox.status === 'error' ? 'error' :
    sandbox.status === 'stopped' ? 'stopped' :
    sandbox.previewUrl ? 'docker' :
    'idle';

  const hasFiles = files && Object.keys(files.files).filter(p => files.files[p]?.status !== 'deleted').length > 0;
  const fileCount = files ? Object.values(files.files).filter((file) => file.status !== 'deleted').length : 0;
  const latestLog = sandbox.logs[sandbox.logs.length - 1] || '';
  const isBuildError = sandbox.buildFailed && sandbox.buildErrors.length > 0;

  const { isAutoFixing, fixAttempt, triggerAutoFix } = useBuildVerification({
    onAutoFixComplete: () => {
      handleRefresh();
    },
  });

  useEffect(() => {
    if (sandbox.status === 'error') {
      onViewChange('console');
    }
  }, [onViewChange, sandbox.status]);

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

        {hasFiles && (
          <div className="h-7 min-w-0 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-bg)] p-0.5 flex items-center gap-0.5 overflow-x-auto">
            {WORKSPACE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              const hasConsoleIssue = tab.id === 'console' && sandbox.status === 'error';
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onViewChange(tab.id)}
                  className={cn(
                    'h-6 px-2.5 rounded-[5px] inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors shrink-0',
                    isActive
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                      : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)]',
                    hasConsoleIssue && !isActive && 'text-[var(--app-danger)]',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden xl:inline">{tab.label}</span>
                  {hasConsoleIssue && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--app-danger)]" />
                  )}
                </button>
              );
            })}
          </div>
        )}

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

      {/* Content */}
      <div className="flex-1 min-h-0 flex flex-col">
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
          activeView === 'code' ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <WorkspaceEditor
                editorView="code"
                showToolbar={false}
                showFileTree={true}
                onEditorViewChange={(view) => onViewChange(view as V0RightView)}
              />
            </div>
          ) : activeView === 'console' ? (
            <DockerConsole
              status={sandbox.status}
              error={sandbox.error}
              logs={sandbox.logs}
              latestLog={latestLog}
              onRetry={handleRefresh}
              buildFailed={isBuildError}
              buildErrors={sandbox.buildErrors}
              onFixErrors={() => triggerAutoFix(sandbox.buildErrors)}
              isAutoFixing={isAutoFixing}
              fixAttempt={fixAttempt}
            />
          ) : activeView === 'connections' ? (
            <WorkspaceConnectionsPanel />
          ) : activeView === 'schema' ? (
            <SchemaGenerator />
          ) : (
            <EnhancedPreviewPane
              height="100%"
              className="flex-1 min-h-0 border-0 rounded-none"
              chromeless
              sandboxUrl={sandbox.previewUrl}
              sandboxError={sandbox.error}
              onRefresh={handleRefresh}
            />
          )
        )}
      </div>
      {hasFiles && activeView === 'code' && (
        <div className="h-7 shrink-0 border-t border-[var(--app-border)] bg-[var(--app-panel)] px-3 flex items-center gap-2 text-[10px] text-[var(--app-text-dim)]">
          <span>{fileCount} files</span>
          <span>·</span>
          <span className="truncate">{activeFilePath || 'No file selected'}</span>
        </div>
      )}
    </div>
  );
}

function DockerConsole({
  status,
  error,
  logs,
  latestLog,
  onRetry,
  buildFailed,
  buildErrors,
  onFixErrors,
  isAutoFixing,
  fixAttempt,
}: {
  status: ReturnType<typeof useSandbox>['status'];
  error: string | null;
  logs: string[];
  latestLog: string;
  onRetry: () => void;
  buildFailed?: boolean;
  buildErrors?: string[];
  onFixErrors?: () => void;
  isAutoFixing?: boolean;
  fixAttempt?: number;
}) {
  const hasError = status === 'error' || !!error;
  const showFixButton = buildFailed && onFixErrors && !!buildErrors?.length;
  return (
    <div className="flex-1 min-h-0 bg-[var(--app-bg)] flex flex-col">
      <div className="h-10 shrink-0 border-b border-[var(--app-border)] bg-[var(--app-panel)] px-3 flex items-center gap-2">
        {hasError ? (
          <AlertTriangle className="h-4 w-4 text-[var(--app-danger)]" />
        ) : status === 'installing' || status === 'creating' ? (
          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
        ) : (
          <Terminal className="h-4 w-4 text-[var(--app-text-dim)]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[var(--app-text)]">
            {hasError ? 'Preview failed' : status === 'running' ? 'Preview running' : 'Preview console'}
          </p>
          <p className="truncate text-[10px] text-[var(--app-text-dim)]">
            {error || latestLog || 'Docker output appears here while the preview starts.'}
          </p>
        </div>
        {showFixButton && (
          <button
            type="button"
            onClick={onFixErrors}
            disabled={isAutoFixing}
            className="h-7 rounded-[6px] border border-[var(--app-accent)]/30 px-2.5 text-[11px] font-semibold text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10 transition-colors disabled:opacity-50"
          >
            {isAutoFixing ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Fixing... ({fixAttempt})
              </span>
            ) : (
              `Fix with AI${fixAttempt ? ` (attempt ${fixAttempt})` : ''}`
            )}
          </button>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="h-7 rounded-[6px] border border-[var(--app-border)] px-2.5 text-[11px] font-medium text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
        >
          Retry
        </button>
      </div>

      <pre className="flex-1 min-h-0 overflow-auto whitespace-pre-wrap break-words p-4 text-[11px] leading-5 font-mono text-[var(--app-text-muted)]">
        {error ? `${error}\n\n` : ''}
        {logs.length > 0 ? logs.join('\n') : 'No Docker logs yet.'}
      </pre>
    </div>
  );
}
