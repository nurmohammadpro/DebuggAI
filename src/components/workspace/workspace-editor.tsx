'use client';

import { CodeEditor } from '@/components/web-builder/code-editor';
import { EnhancedPreviewPane } from '@/components/web-builder/enhanced-preview-pane';
import { ProfessionalFileTree } from '@/components/workspace/professional-file-tree';
import { useGenerationStore } from '@/store/generation-store';
import { useSandbox } from '@/hooks/use-sandbox';
import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import {
  Code2,
  Eye,
  Folder,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type EditorView = 'code' | 'preview';

// ── File icon helper (used in toolbar) ─────────────────────────────────────
const FILE_EXT_COLORS: Record<string, string> = {
  tsx: '#61DAFB', ts: '#F7DF1E', jsx: '#61DAFB', js: '#F7DF1E',
  css: '#264DE4', json: '#FAC863', md: '#88A0A8', html: '#E44D26',
};

function getFileExtColor(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return FILE_EXT_COLORS[ext] || 'var(--app-text-dim)';
}

// ── Main WorkspaceEditor ───────────────────────────────────────────────────
export function WorkspaceEditor({
  editorView = 'code',
  onEditorViewChange,
  showToolbar = true,
  showFileTree = true,
}: {
  editorView?: EditorView;
  onEditorViewChange?: (view: EditorView) => void;
  showToolbar?: boolean;
  showFileTree?: boolean;
}) {
  const { activeFilePath, files, setActiveFilePath } = useGenerationStore();
  const language = activeFilePath ? files?.files[activeFilePath]?.language : undefined;
  const [fileTreeOpen, setFileTreeOpen] = useState(true);

  const sandbox = useSandbox();
  const sandboxStartingRef = useRef(false);

  // Docker files for sandbox
  const dockerFiles = useMemo(() => {
    if (!files?.files) return null;
    const out: Record<string, string> = {};
    for (const [p, f] of Object.entries(files.files)) {
      if (f.status === 'deleted') continue;
      const key = p.startsWith('/') ? p.slice(1) : p;
      out[key] = f.content;
    }
    const hasGeneratedFiles = !!(out['package.json'] || out['app/page.tsx'] || out['src/App.tsx']);
    if (!hasGeneratedFiles) return out;
    if (!out['package.json']) {
      const isTs = Object.keys(out).some((p) => p.endsWith('.ts') || p.endsWith('.tsx'));
      out['app/layout.tsx'] =
        out['app/layout.tsx'] ||
        [
          "import './globals.css';",
          '',
          'export default function RootLayout({ children }: { children: React.ReactNode }) {',
          '  return (',
          '    <html lang="en">',
          '      <body>{children}</body>',
          '    </html>',
          '  );',
          '}',
        ].join('\n');

      out['app/page.tsx'] =
        out['app/page.tsx'] ||
        out['src/App.tsx'] ||
        'export default function Page() { return <main style={{ padding: 24 }}>Hello from Next.js</main>; }';

      out['app/globals.css'] = out['app/globals.css'] || 'html,body{height:100%;margin:0}';
      out['next.config.js'] =
        out['next.config.js'] ||
        '/** @type {import("next").NextConfig} */\nconst nextConfig = {};\nmodule.exports = nextConfig;\n';
      out['package.json'] =
        out['package.json'] ||
        JSON.stringify(
          {
            name: 'next-preview-app',
            private: true,
            version: '0.0.0',
            scripts: {
              dev: 'next dev -H 0.0.0.0 -p 3000',
              build: 'next build',
              start: 'next start -H 0.0.0.0 -p 3000',
            },
            dependencies: {
              next: '^16.2.3',
              react: '^19.2.4',
              'react-dom': '^19.2.4',
            },
            devDependencies: isTs
              ? { typescript: '^5.0.0', '@types/node': '^20.0.0', '@types/react': '^19.0.0', '@types/react-dom': '^19.0.0' }
              : {},
          },
          null,
          2
        );
    }
    return out;
  }, [files]);

  const shouldUseDockerSandbox = useMemo(
    () => editorView === 'preview',
    [editorView]
  );

  const ensureSandboxRunning = useCallback(async () => {
    if (!shouldUseDockerSandbox || !dockerFiles) return;
    if (sandbox.status !== 'idle' && sandbox.status !== 'stopped') return;
    if (sandboxStartingRef.current) return;
    sandboxStartingRef.current = true;
    await sandbox.createSandbox(dockerFiles);
    sandboxStartingRef.current = false;
  }, [dockerFiles, sandbox, shouldUseDockerSandbox]);

  const recreateSandbox = useCallback(async () => {
    if (!shouldUseDockerSandbox || !dockerFiles) return;
    try { await sandbox.stopSandbox(); } finally { await sandbox.createSandbox(dockerFiles); }
  }, [dockerFiles, sandbox, shouldUseDockerSandbox]);

  useEffect(() => {
    if (editorView !== 'preview') return;
    void ensureSandboxRunning();
  }, [editorView, ensureSandboxRunning]);

  const fileCount = files ? Object.values(files.files).filter((f) => f.status !== 'deleted').length : 0;

  return (
    <section className="flex-1 min-w-0 bg-[var(--app-bg)] flex flex-col min-h-0 h-full">
      {showToolbar && (
        <div className="h-10 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center px-3 gap-2 shrink-0">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {activeFilePath ? (
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="w-2.5 h-2.5 rounded-[3px] shrink-0" style={{ backgroundColor: getFileExtColor(activeFilePath.split('/').pop() || '') }} />
                <span className="text-[11px] font-medium text-[var(--app-text)] truncate">
                  {activeFilePath}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-[var(--app-text-dim)]">
                {fileCount > 0 ? `${fileCount} files` : 'No files'}
              </span>
            )}
          </div>

          <div className="flex items-center shrink-0 rounded-[7px] bg-[var(--app-panel-2)] p-0.5 border border-[var(--app-border)]">
            <button
              className={cn(
                'h-7 px-3 rounded-[5px] text-[11px] font-medium transition-colors flex items-center gap-1.5',
                editorView === 'code'
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              )}
              onClick={() => onEditorViewChange?.('code')}
            >
              <Code2 className="h-3 w-3" />
              Code
            </button>
            <button
              className={cn(
                'h-7 px-3 rounded-[5px] text-[11px] font-medium transition-colors flex items-center gap-1.5',
                editorView === 'preview'
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              )}
              onClick={() => onEditorViewChange?.('preview')}
            >
              <Eye className="h-3 w-3" />
              Preview
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 flex">
        {editorView === 'preview' ? (
          <EnhancedPreviewPane
            height="100%"
            chromeless
            className="flex-1 min-h-0"
            sandboxUrl={shouldUseDockerSandbox ? sandbox.previewUrl : null}
            sandboxError={shouldUseDockerSandbox ? sandbox.error : null}
            onRefresh={shouldUseDockerSandbox ? recreateSandbox : undefined}
          />
        ) : (
          <>
            {/* File Tree Sidebar — collapsible */}
            {showFileTree && fileCount > 0 && fileTreeOpen && (
              <div className="w-56 shrink-0 border-r border-[var(--app-border)] bg-[var(--app-panel-2)] flex flex-col overflow-hidden">
                <div className="h-8 px-3 flex items-center justify-between border-b border-[var(--app-border)] shrink-0">
                  <div className="flex items-center gap-2">
                    <Folder className="h-3.5 w-3.5 text-[var(--app-accent)]" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Files</span>
                  </div>
                  <button
                    onClick={() => setFileTreeOpen(false)}
                    className="h-6 w-6 rounded-[4px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                    title="Hide file tree"
                  >
                    <PanelLeftClose className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  <ProfessionalFileTree
                    onFileSelect={(path) => setActiveFilePath(path)}
                  />
                </div>
              </div>
            )}

            {/* Show tree toggle when collapsed */}
            {showFileTree && fileCount > 0 && !fileTreeOpen && (
              <button
                onClick={() => setFileTreeOpen(true)}
                className="absolute left-0 top-0 z-10 h-8 w-8 rounded-r-[6px] bg-[var(--app-panel-2)] border border-l-0 border-[var(--app-border)] flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors shadow-sm"
                title="Show file tree"
              >
                <PanelLeftOpen className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Monaco Editor */}
            <CodeEditor
              height="100%"
              showHeader={false}
              language={language}
              className="flex-1 min-w-0 rounded-none border-0 bg-transparent"
            />
          </>
        )}
      </div>
    </section>
  );
}
