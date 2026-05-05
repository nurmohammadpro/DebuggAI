/**
 * Web Builder Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 * Two-column layout: Chat | Code/Preview (togglable like v0.dev)
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
  ExternalLink,
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
    // Convert VirtualProjectFiles to Record<string, string>
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

  const sandboxPreviewUrl = sandbox.status === 'running' && sandbox.id
    ? `/preview/${sandbox.id}`
    : null;

  if (authLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--ds-green)' }}></div>
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
    <div className="flex-1 min-h-0 overflow-hidden flex gap-6 p-4 sm:p-6">
      {/* Left Panel: Chat & AI interaction */}
      <div className="w-[380px] shrink-0 min-h-0">
        <ChatPanel height="100%" />
      </div>

      {/* Right Panel: Codebase & Preview */}
      <div className="flex-1 min-h-0 flex flex-col bg-card/60 backdrop-blur-xl rounded-2xl border border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden transition-all duration-500">
          {/* Main Toolbar */}
          <div className="h-12 border-b border-white/[0.05] flex items-center px-4 shrink-0 bg-white/[0.02] backdrop-blur-md justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/[0.03] border border-white/[0.05]">
                <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400/80">
                  Workspace
                </span>
              </div>
              {view === 'code' && activeFilePath && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/60 animate-in slide-in-from-left-2 duration-300">
                  <span className="opacity-30">/</span>
                  <span className="font-mono bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05] text-foreground/80 truncate max-w-[200px]">
                    {activeFilePath}
                  </span>
                </div>
              )}
              {isRunning && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Live</span>
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
                    "flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-tight transition-all border",
                    files
                      ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)] hover:bg-emerald-500/30"
                      : "text-muted-foreground/40 border-white/[0.05] cursor-not-allowed"
                  )}
                >
                  <PlayIcon className="h-3.5 w-3.5" />
                  Build & Run
                </button>
              )}

              {/* Building state */}
              {isBuilding && (
                <div className="flex items-center gap-2 h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-tight text-amber-400 border border-amber-500/20 bg-amber-500/10">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Installing...
                </div>
              )}

              {/* Running state controls */}
              {isRunning && (
                <>
                  <button
                    onClick={sandbox.exportZip}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-tight transition-all border text-muted-foreground border-white/[0.05] hover:bg-white/[0.05] hover:text-foreground"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export
                  </button>
                  <button
                    onClick={sandbox.stopSandbox}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-tight transition-all border text-rose-400 border-rose-500/30 hover:bg-rose-500/10"
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
                    "flex items-center gap-1.5 h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-tight transition-all border",
                    showDiff
                      ? "bg-amber-500/20 text-amber-500 border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      : "text-muted-foreground border-white/[0.05] hover:bg-white/[0.05] hover:text-foreground"
                  )}
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  Diff View
                </button>
              )}

              {/* Code/Preview toggle */}
              <div className="flex items-center bg-black/20 rounded-xl p-1 border border-white/[0.05]">
                <button
                  className={cn(
                    "h-7 px-4 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                    view === 'code'
                      ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
                  )}
                  onClick={() => setView('code')}
                >
                  <Code2 className="h-3.5 w-3.5" />
                  Code
                </button>
                <button
                  className={cn(
                    "h-7 px-4 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                    view === 'preview'
                      ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.05]'
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
                className="w-64 bg-black/10 backdrop-blur-sm border-r border-white/[0.05]"
              />
            )}
            {view === 'code' && showTerminal && (
              <TerminalPanel
                logs={sandbox.logs}
                isBuilding={isBuilding}
                error={sandbox.error}
                className="w-80 bg-black/10 backdrop-blur-sm border-r border-white/[0.05]"
              />
            )}

            {/* Editor or Preview Pane */}
            <div className="flex-1 min-h-0 relative bg-black/5 animate-in fade-in zoom-in-95 duration-500">
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
                  className="rounded-none border-0 shadow-none bg-transparent"
                />
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
