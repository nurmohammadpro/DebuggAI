/**
 * Minimal Web Builder Content
 * Simplified version that works with the minimal layout
 */

'use client';

import { useState, useEffect } from 'react';
import { ChatPanel } from '@/components/web-builder/chat-panel';
import { CodeEditor } from '@/components/web-builder/code-editor';
import { PreviewPane } from '@/components/web-builder/preview-pane';
import { FileTree } from '@/components/web-builder/file-tree';
import { TerminalPanel } from '@/components/web-builder/terminal-panel';
import { useSessionStore } from '@/store/session-store';
import { useGenerationStore } from '@/store/generation-store';
import { useSandbox } from '@/hooks/use-sandbox';
import {
  GitCompare,
  Code2,
  Play,
  Square,
  Download,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EditorView = 'code' | 'preview';

export function MinimalWebBuilderContent() {
  const { isAuthenticated, isLoading: authLoading } = useSessionStore();
  const {
    files,
    activeFilePath,
    setActiveFilePath,
    savedSnapshot,
  } = useGenerationStore();

  const [view, setView] = useState<EditorView>('code');
  const [showDiff, setShowDiff] = useState(false);

  const sandbox = useSandbox();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated, authLoading]);

  const handleBuild = async () => {
    if (!files) return;
    const fileMap: Record<string, string> = {};
    for (const [path, file] of Object.entries(files.files)) {
      if (file.status !== 'deleted') {
        fileMap[path] = file.content;
      }
    }
    await sandbox.createSandbox(fileMap);
    setView('preview');
  };

  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--app-bg)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--app-accent)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isBuilding = sandbox.status === 'creating' || sandbox.status === 'installing';
  const isRunning = sandbox.status === 'running';
  const showTerminal = isBuilding || isRunning || sandbox.status === 'error';

  return (
    <div className="h-full flex">
      {/* Left Panel: Chat & AI interaction */}
      <div className="w-80 shrink-0 border-r border-[var(--app-border)] bg-[var(--app-panel)]">
        <div className="h-12 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center px-3">
          <div className="flex items-center gap-2 px-2 py-1 rounded-[6px] bg-[var(--app-accent-soft)] border border-[var(--app-border)]">
            <Code2 className="h-3.5 w-3.5 text-[var(--app-accent)]" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)]">
              Web Builder
            </span>
          </div>
        </div>
        <ChatPanel height="calc(100% - 48px)" chromeless />
      </div>

      {/* Right Panel: Codebase & Preview */}
      <div className="flex-1 min-w-0 flex flex-col bg-[var(--app-bg)]">
        {/* Main Toolbar */}
        <div className="h-12 border-b border-[var(--app-border)] flex items-center px-4 shrink-0 bg-[var(--app-panel)] justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-[var(--app-accent)] border border-[var(--app-accent)]">
              <Code2 className="h-3 w-3 text-[#071006]" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#071006]">
                Web Builder
              </span>
            </div>
            {view === 'code' && activeFilePath && (
              <div className="flex items-center gap-2 text-[10px] text-[var(--app-text-dim)]">
                <span className="opacity-30">/</span>
                <span className="font-mono bg-[var(--app-surface)] px-2 py-0.5 rounded-[6px] border border-[var(--app-border)] text-[var(--app-text)] truncate max-w-[200px]">
                  {activeFilePath}
                </span>
              </div>
            )}
            {isRunning && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[var(--app-success-soft)] border border-[var(--app-success)]/30">
                <div className="w-1 h-1 rounded-full bg-[var(--app-success)] animate-pulse" />
                <span className="text-[9px] font-semibold text-[var(--app-success)] uppercase tracking-[0.12em]">Live</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {view === 'code' && !isBuilding && !isRunning && (
              <button
                onClick={handleBuild}
                disabled={!files}
                className={cn(
                  "flex items-center gap-1 h-8 px-3 rounded-[6px] text-[10px] font-semibold uppercase tracking-tight transition-all border",
                  files
                    ? "bg-[var(--app-accent)] text-[#071006] border-[var(--app-accent)] hover:opacity-90"
                    : "text-[var(--app-text-dim)] border-[var(--app-border)] cursor-not-allowed"
                )}
              >
                <Play className="h-3 w-3" />
                Build
              </button>
            )}

            {isBuilding && (
              <div className="flex items-center gap-2 h-8 px-3 rounded-[6px] text-[10px] font-semibold uppercase tracking-tight text-[var(--app-warning)] border border-[var(--app-warning)]/30 bg-[var(--app-warning-soft)]">
                <Loader2 className="h-3 w-3 animate-spin" />
                Installing...
              </div>
            )}

            {isRunning && (
              <>
                <button
                  onClick={sandbox.exportZip}
                  className="flex items-center gap-1 h-8 px-3 rounded-[6px] text-[10px] font-semibold uppercase tracking-tight transition-all border text-[var(--app-text)] border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)]"
                >
                  <Download className="h-3 w-3" />
                  Export
                </button>
                <button
                  onClick={sandbox.stopSandbox}
                  className="flex items-center gap-1 h-8 px-3 rounded-[6px] text-[10px] font-semibold uppercase tracking-tight transition-all border text-[var(--app-danger)] border-[var(--app-danger)]/35 hover:bg-[var(--app-danger-soft)]"
                >
                  <Square className="h-3 w-3" />
                  Stop
                </button>
              </>
            )}

            {view === 'code' && !isBuilding && (
              <button
                onClick={() => setShowDiff(!showDiff)}
                className={cn(
                  "flex items-center gap-1 h-8 px-3 rounded-[6px] text-[10px] font-semibold uppercase tracking-tight transition-all border",
                  showDiff
                    ? "bg-[var(--app-warning-soft)] text-[var(--app-warning)] border-[var(--app-warning)]/35"
                    : "text-[var(--app-text)] border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)]"
                )}
              >
                <GitCompare className="h-3 w-3" />
                Diff
              </button>
            )}

            <div className="flex items-center bg-[var(--app-panel-2)] rounded-[6px] p-0.5 border border-[var(--app-border)]">
              <button
                className={cn(
                  "h-7 px-3 rounded-[6px] text-[10px] font-semibold uppercase tracking-[0.12em] transition-all flex items-center gap-1.5",
                  view === 'code'
                    ? 'bg-[var(--app-accent)] text-[#071006]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
                )}
                onClick={() => setView('code')}
              >
                <Code2 className="h-3 w-3" />
                Code
              </button>
              <button
                className={cn(
                  "h-7 px-3 rounded-[6px] text-[10px] font-semibold uppercase tracking-[0.12em] transition-all flex items-center gap-1.5",
                  view === 'preview'
                    ? 'bg-[var(--app-accent)] text-[#071006]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
                )}
                onClick={() => setView('preview')}
              >
                <Play className="h-3 w-3" />
                Preview
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex">
          {view === 'code' && !showTerminal && (
            <FileTree
              files={files}
              activePath={activeFilePath}
              onSelect={setActiveFilePath}
              className="w-56 bg-[var(--app-panel)] border-r border-[var(--app-border)]"
            />
          )}
          {view === 'code' && showTerminal && (
            <TerminalPanel
              logs={sandbox.logs}
              isBuilding={isBuilding}
              error={sandbox.error}
              className="w-72 bg-[var(--app-panel)] border-r border-[var(--app-border)]"
            />
          )}

          <div className="flex-1 min-h-0 relative">
            {view === 'preview' ? (
              <PreviewPane
                height="100%"
                chromeless
                className="h-full bg-transparent"
                sandboxUrl={isRunning ? `/preview/${sandbox.id}` : null}
              />
            ) : (
              <CodeEditor
                height="100%"
                showHeader={false}
                showDiff={showDiff}
                originalCode={savedSnapshot}
                className="border-0 bg-transparent"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
