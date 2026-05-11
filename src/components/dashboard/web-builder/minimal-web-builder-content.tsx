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
      <div className="h-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--accent)' }} />
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
      <div className="w-[380px] shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <ChatPanel height="100%" chromeless />
      </div>

      {/* Right Panel: Codebase & Preview */}
      <div className="flex-1 min-w-0 flex flex-col bg-[var(--bg-primary)]">
        {/* Main Toolbar */}
        <div className="h-12 border-b border-[var(--border-default)] flex items-center px-4 shrink-0 bg-[var(--bg-secondary)] justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
              <Code2 className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--accent)' }}>
                Web Builder
              </span>
            </div>
            {view === 'code' && activeFilePath && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                <span className="opacity-30">/</span>
                <span className="font-mono bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[var(--text-primary)] truncate max-w-[200px]">
                  {activeFilePath}
                </span>
              </div>
            )}
            {isRunning && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[var(--radius-md)] bg-[var(--success)]/10 border border-[var(--success)]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
                <span className="text-[10px] font-semibold text-[var(--success)] uppercase tracking-[0.12em]">Live</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {view === 'code' && !isBuilding && !isRunning && (
              <button
                onClick={handleBuild}
                disabled={!files}
                className={cn(
                  "flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-[11px] font-semibold uppercase tracking-tight transition-all border",
                  files
                    ? "bg-[var(--accent)] text-white border-[var(--accent)] hover:opacity-90"
                    : "text-[var(--text-tertiary)] border-[var(--border-default)] cursor-not-allowed"
                )}
              >
                <Play className="h-3.5 w-3.5" />
                Build & Run
              </button>
            )}

            {isBuilding && (
              <div className="flex items-center gap-2 h-8 px-3 rounded-[var(--radius-md)] text-[11px] font-semibold uppercase tracking-tight text-[var(--warning)] border border-[var(--warning)]/20 bg-[var(--warning)]/10">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Installing...
              </div>
            )}

            {isRunning && (
              <>
                <button
                  onClick={sandbox.exportZip}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-[11px] font-semibold uppercase tracking-tight transition-all border text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
                <button
                  onClick={sandbox.stopSandbox}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-[11px] font-semibold uppercase tracking-tight transition-all border text-[var(--error)] border-[var(--error)]/30 hover:bg-[var(--error)]/10"
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </button>
              </>
            )}

            {view === 'code' && !isBuilding && (
              <button
                onClick={() => setShowDiff(!showDiff)}
                className={cn(
                  "flex items-center gap-1.5 h-8 px-3 rounded-[var(--radius-md)] text-[11px] font-semibold uppercase tracking-tight transition-all border",
                  showDiff
                    ? "bg-[var(--warning)]/20 text-[var(--warning)] border-[var(--warning)]/40"
                    : "text-[var(--text-secondary)] border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
                )}
              >
                <GitCompare className="h-3.5 w-3.5" />
                Diff View
              </button>
            )}

            <div className="flex items-center bg-[var(--bg-secondary)] rounded-[var(--radius-md)] p-0.5 border border-[var(--border-default)]">
              <button
                className={cn(
                  "h-7 px-4 rounded-[var(--radius-md)] text-[11px] font-semibold uppercase tracking-[0.12em] transition-all flex items-center gap-2",
                  view === 'code'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                )}
                onClick={() => setView('code')}
              >
                <Code2 className="h-3.5 w-3.5" />
                Code
              </button>
              <button
                className={cn(
                  "h-7 px-4 rounded-[var(--radius-md)] text-[11px] font-semibold uppercase tracking-[0.12em] transition-all flex items-center gap-2",
                  view === 'preview'
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                )}
                onClick={() => setView('preview')}
              >
                <Play className="h-3.5 w-3.5" />
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
              className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-default)]"
            />
          )}
          {view === 'code' && showTerminal && (
            <TerminalPanel
              logs={sandbox.logs}
              isBuilding={isBuilding}
              error={sandbox.error}
              className="w-80 bg-[var(--bg-secondary)] border-r border-[var(--border-default)]"
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
