/**
 * Web Builder Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 * Two-column layout: Chat | Code/Preview
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
import { useRouter } from 'next/navigation';
import {
  GitCompare,
  Code2,
  Play,
  PlayIcon,
  Square,
  Download,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type EditorView = 'code' | 'preview';

export default function WebBuilderPage() {
  const { isAuthenticated, isLoading: authLoading } = useSessionStore();
  const {
    files,
    activeFilePath,
    setActiveFilePath,
    savedSnapshot,
  } = useGenerationStore();

  const router = useRouter();
  const [view, setView] = useState<EditorView>('code');
  const [showDiff, setShowDiff] = useState(false);

  const sandbox = useSandbox();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

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
    <div className="flex-1 min-h-0 overflow-hidden flex">
      {/* Left Panel: Chat & AI interaction */}
      <div className="w-[380px] shrink-0 min-h-0 bg-[var(--app-panel)] border-r border-[var(--app-border)]">
        <ChatPanel height="100%" chromeless />
      </div>

      {/* Right Panel: Codebase & Preview */}
      <div className="flex-1 min-h-0 flex flex-col bg-[var(--app-panel-2)] overflow-hidden">
        {/* Main Toolbar */}
        <div className="h-12 border-b border-[var(--app-border)] flex items-center px-4 shrink-0 bg-[var(--app-panel-2)] justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)]">
              <Code2 className="h-3.5 w-3.5 text-[var(--app-accent)]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)]/80">
                Workspace
              </span>
            </div>
            {view === 'code' && activeFilePath && (
              <div className="flex items-center gap-2 text-[11px] text-[var(--app-text-dim)]">
                <span className="opacity-30">/</span>
                <span className="font-mono bg-[var(--app-surface)] px-2 py-0.5 rounded-[6px] border border-[var(--app-border)] text-[var(--app-text)]/80 truncate max-w-[200px]">
                  {activeFilePath}
                </span>
              </div>
            )}
            {isRunning && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[var(--app-success-soft)] border border-[var(--app-success)]/20">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-success)] animate-pulse" />
                <span className="text-[10px] font-semibold text-[var(--app-success)] uppercase tracking-[0.12em]">Live</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Build & Run button */}
            {view === 'code' && !isBuilding && !isRunning && (
              <button
                onClick={handleBuild}
                disabled={!files}
                className={cn(
                  "flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight transition-all border",
                  files
                    ? "bg-[var(--app-accent)] text-[#071006] border-[var(--app-accent)] hover:opacity-90"
                    : "text-[var(--app-text-dim)] border-[var(--app-border)] cursor-not-allowed"
                )}
              >
                <PlayIcon className="h-3.5 w-3.5" />
                Build & Run
              </button>
            )}

            {/* Building state */}
            {isBuilding && (
              <div className="flex items-center gap-2 h-8 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight text-[var(--app-warning)] border border-[var(--app-warning)]/20 bg-[var(--app-warning)]/10">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Installing...
              </div>
            )}

            {/* Running state controls */}
            {isRunning && (
              <>
                <button
                  onClick={sandbox.exportZip}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight transition-all border text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
                <button
                  onClick={sandbox.stopSandbox}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight transition-all border text-[var(--app-danger)] border-[var(--app-danger)]/30 hover:bg-[var(--app-danger)]/10"
                >
                  <Square className="h-3.5 w-3.5" />
                  Stop
                </button>
              </>
            )}

            {/* Diff button */}
            {view === 'code' && !isBuilding && (
              <button
                onClick={() => setShowDiff(!showDiff)}
                className={cn(
                  "flex items-center gap-1.5 h-8 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight transition-all border",
                  showDiff
                    ? "bg-[var(--app-warning)]/20 text-[var(--app-warning)] border-[var(--app-warning)]/40"
                    : "text-[var(--app-text-muted)] border-[var(--app-border)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                )}
              >
                <GitCompare className="h-3.5 w-3.5" />
                Diff View
              </button>
            )}

            {/* Code/Preview toggle */}
            <div className="flex items-center bg-[var(--app-panel-2)] rounded-[6px] p-0.5 border border-[var(--app-border)]">
              <button
                className={cn(
                  "h-7 px-4 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] transition-all flex items-center gap-2",
                  view === 'code'
                    ? 'bg-[var(--app-accent)] text-[#071006]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
                )}
                onClick={() => setView('code')}
              >
                <Code2 className="h-3.5 w-3.5" />
                Code
              </button>
              <button
                className={cn(
                  "h-7 px-4 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] transition-all flex items-center gap-2",
                  view === 'preview'
                    ? 'bg-[var(--app-accent)] text-[#071006]'
                    : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
                )}
                onClick={() => setView('preview')}
              >
                <Play className="h-3.5 w-3.5" />
                Preview
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* File Tree or Terminal panel */}
          {view === 'code' && !showTerminal && (
            <FileTree
              files={files}
              activePath={activeFilePath}
              onSelect={setActiveFilePath}
              className="w-64 bg-[var(--app-panel)] border-r border-[var(--app-border)]"
            />
          )}
          {view === 'code' && showTerminal && (
            <TerminalPanel
              logs={sandbox.logs}
              isBuilding={isBuilding}
              error={sandbox.error}
              className="w-80 bg-[var(--app-panel)] border-r border-[var(--app-border)]"
            />
          )}

          {/* Editor or Preview Pane */}
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
