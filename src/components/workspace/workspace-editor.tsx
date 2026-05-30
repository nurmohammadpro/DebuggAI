'use client';

import { CodeEditor } from '@/components/web-builder/code-editor';
import { EnhancedPreviewPane } from '@/components/web-builder/enhanced-preview-pane';
import { WorkspaceEditorTabs } from '@/components/workspace/workspace-editor-tabs';
import { useGenerationStore } from '@/store/generation-store';
import { useSandbox } from '@/hooks/use-sandbox';
import { useEffect, useMemo, useCallback, useRef, useState } from 'react';

export type EditorView = 'code' | 'preview';

export function WorkspaceEditor({
  editorView = 'code',
  onEditorViewChange,
}: {
  editorView?: EditorView;
  onEditorViewChange?: (view: EditorView) => void;
}) {
  const { activeFilePath, files } = useGenerationStore();
  const language = activeFilePath ? files?.files[activeFilePath]?.language : undefined;

  const sandbox = useSandbox();
  const sandboxStartingRef = useRef(false);
  const [dockerFallback, setDockerFallback] = useState(false);

  // When sandbox creation fails due to Docker being unavailable, fall back to Sandpack.
  useEffect(() => {
    if (
      sandbox.error &&
      (sandbox.error.includes('Docker is required') ||
        sandbox.error.includes('Live preview is temporarily disabled'))
    ) {
      setDockerFallback(true);
      sandbox.clearError();
    }
  }, [sandbox.error, sandbox.clearError]);

  const dockerFiles = useMemo(() => {
    if (!files?.files) return null;
    const out: Record<string, string> = {};
    for (const [p, f] of Object.entries(files.files)) {
      if (f.status === 'deleted') continue;
      const key = p.startsWith('/') ? p.slice(1) : p;
      out[key] = f.content;
    }

    // If we don't have a runnable project manifest, scaffold a minimal Next.js App Router project
    // so Docker preview always works (Next.js-only product direction).
    if (!out['package.json']) {
      const isTs =
        Object.keys(out).some((p) => p.endsWith('.ts') || p.endsWith('.tsx'));

      const existingPage: string | null =
        out['app/page.tsx'] ||
        out['app/page.jsx'] ||
        out['src/App.tsx'] ||
        out['src/App.jsx'] ||
        out['App.tsx'] ||
        out['App.jsx'] ||
        null;

      // Basic app router shell
      out['app/layout.tsx'] =
        out['app/layout.tsx'] ||
        [
          "import './globals.css';",
          '',
          'export default function RootLayout({',
          '  children,',
          '}: {',
          '  children: React.ReactNode;',
          '}) {',
          '  return (',
          '    <html lang=\"en\">',
          '      <body>{children}</body>',
          '    </html>',
          '  );',
          '}',
          '',
        ].join('\n');

      out['app/page.tsx'] =
        out['app/page.tsx'] ||
        (existingPage
          ? existingPage
          : [
              'export default function Page() {',
              "  return <main style={{ padding: 24 }}>Hello from Next.js</main>;",
              '}',
              '',
            ].join('\n'));

      out['app/globals.css'] = out['app/globals.css'] || 'html,body{height:100%;margin:0}';

      out['next.config.js'] =
        out['next.config.js'] ||
        [
          '/** @type {import(\"next\").NextConfig} */',
          'const nextConfig = {};',
          '',
          'module.exports = nextConfig;',
          '',
        ].join('\n');

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
              ? {
                  typescript: '^5.0.0',
                  '@types/node': '^20.0.0',
                  '@types/react': '^19.0.0',
                  '@types/react-dom': '^19.0.0',
                }
              : {},
          },
          null,
          2,
        );
    }

    return out;
  }, [files]);

  const shouldUseDockerSandbox = useMemo(() => {
    // Fall back to Sandpack when Docker isn't available (e.g. production).
    if (dockerFallback) return false;
    return editorView === 'preview';
  }, [editorView, dockerFallback]);

  const ensureSandboxRunning = useCallback(async () => {
    if (!shouldUseDockerSandbox) return;
    if (!dockerFiles) return;
    // Avoid hammering the API if sandbox creation fails (e.g. plan/credits).
    // Only auto-attempt when idle/stopped; retries should be user-driven via refresh.
    if (sandbox.status !== 'idle' && sandbox.status !== 'stopped') return;
    if (sandboxStartingRef.current) return;
    sandboxStartingRef.current = true;
    await sandbox.createSandbox(dockerFiles);
    sandboxStartingRef.current = false;
  }, [dockerFiles, sandbox, shouldUseDockerSandbox]);

  const recreateSandbox = useCallback(async () => {
    if (!shouldUseDockerSandbox) return;
    if (!dockerFiles) return;
    try {
      await sandbox.stopSandbox();
    } finally {
      await sandbox.createSandbox(dockerFiles);
    }
  }, [dockerFiles, sandbox, shouldUseDockerSandbox]);

  useEffect(() => {
    if (editorView !== 'preview') return;
    void ensureSandboxRunning();
  }, [editorView, ensureSandboxRunning]);

  return (
    <section className="flex-1 min-w-0 bg-[var(--app-bg)] flex flex-col min-h-0 h-full">
      {/* Toolbar: file tabs + code/preview toggle */}
      <div className="h-11 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center overflow-x-auto px-2 gap-2">
        <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-1">
          <WorkspaceEditorTabs />
          {(!files || Object.keys(files.files).length === 0) && (
            <span className="text-xs text-[var(--app-text-muted)] px-3">No files loaded</span>
          )}
        </div>

        {/* Code / Preview segmented toggle */}
        <div className="flex items-center shrink-0 mr-1 rounded-[8px] bg-[var(--app-panel-2)] p-0.5">
          <button
            className={`h-7 px-3 rounded-[6px] text-[11px] font-normal transition-colors ${
              editorView === 'code'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
            onClick={() => onEditorViewChange?.('code')}
          >
            Code
          </button>
          <button
            className={`h-7 px-3 rounded-[6px] text-[11px] font-normal transition-colors ${
              editorView === 'preview'
                ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
            }`}
            onClick={() => onEditorViewChange?.('preview')}
          >
            Preview
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 h-full">
        {editorView === 'preview' ? (
          <EnhancedPreviewPane
            height="100%"
            chromeless
            className="h-full"
            forceSandbox={shouldUseDockerSandbox}
            sandboxUrl={shouldUseDockerSandbox ? sandbox.previewUrl : null}
            sandboxError={shouldUseDockerSandbox ? sandbox.error : null}
            onRefresh={shouldUseDockerSandbox ? recreateSandbox : undefined}
          />
        ) : (
          <CodeEditor
            height="100%"
            showHeader={false}
            language={language}
            className="rounded-none border-0 bg-transparent"
          />
        )}
      </div>
    </section>
  );
}
