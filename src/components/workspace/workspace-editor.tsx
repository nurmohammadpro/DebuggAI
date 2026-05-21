'use client';

import { CodeEditor } from '@/components/web-builder/code-editor';
import { PreviewPane } from '@/components/web-builder/preview-pane';
import { WorkspaceEditorTabs } from '@/components/workspace/workspace-editor-tabs';
import { useGenerationStore } from '@/store/generation-store';
import { useSandbox } from '@/hooks/use-sandbox';
import { useEffect, useMemo, useCallback, useRef } from 'react';

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

  const dockerFiles = useMemo(() => {
    if (!files?.files) return null;
    const out: Record<string, string> = {};
    for (const [p, f] of Object.entries(files.files)) {
      if (f.status === 'deleted') continue;
      const key = p.startsWith('/') ? p.slice(1) : p;
      out[key] = f.content;
    }

    // If we don't have a runnable project manifest, scaffold a tiny Vite+React app
    // around the generated component so Docker preview always works.
    if (!out['package.json']) {
      const isTs =
        Object.keys(out).some((p) => p.endsWith('.ts') || p.endsWith('.tsx'));

      // Prefer an existing App file if present.
      const appPath =
        out['src/App.tsx'] ? 'src/App.tsx'
          : out['src/App.jsx'] ? 'src/App.jsx'
          : out['App.tsx'] ? 'src/App.tsx'
          : out['App.jsx'] ? 'src/App.jsx'
          : isTs ? 'src/App.tsx' : 'src/App.jsx';

      const existingApp =
        out['src/App.tsx'] || out['src/App.jsx'] || out['App.tsx'] || out['App.jsx'] || null;

      out['src/App.tsx'] = appPath.endsWith('.tsx') ? (existingApp ?? out['src/App.tsx'] ?? '') : out['src/App.tsx'];
      out['src/App.jsx'] = appPath.endsWith('.jsx') ? (existingApp ?? out['src/App.jsx'] ?? '') : out['src/App.jsx'];

      // Normalize the app file into src/
      if (existingApp && (out['App.tsx'] || out['App.jsx'])) {
        delete out['App.tsx'];
        delete out['App.jsx'];
      }

      const mainFile = isTs ? 'src/main.tsx' : 'src/main.jsx';
      out[mainFile] =
        isTs
          ? [
              "import React from 'react';",
              "import ReactDOM from 'react-dom/client';",
              "import App from './App';",
              "import './index.css';",
              '',
              'ReactDOM.createRoot(document.getElementById(\"root\") as HTMLElement).render(',
              '  <React.StrictMode>',
              '    <App />',
              '  </React.StrictMode>',
              ');',
              '',
            ].join('\n')
          : [
              "import React from 'react';",
              "import ReactDOM from 'react-dom/client';",
              "import App from './App';",
              "import './index.css';",
              '',
              'ReactDOM.createRoot(document.getElementById(\"root\")).render(',
              '  <React.StrictMode>',
              '    <App />',
              '  </React.StrictMode>',
              ');',
              '',
            ].join('\n');

      out['src/index.css'] = out['src/index.css'] || 'html,body,#root{height:100%;margin:0}';
      out['index.html'] =
        out['index.html'] ||
        [
          '<!doctype html>',
          '<html lang="en">',
          '  <head>',
          '    <meta charset="UTF-8" />',
          '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          '    <title>Preview</title>',
          '  </head>',
          '  <body>',
          '    <div id="root"></div>',
          `    <script type="module" src="/${mainFile}"></script>`,
          '  </body>',
          '</html>',
          '',
        ].join('\n');

      out['package.json'] =
        out['package.json'] ||
        JSON.stringify(
          {
            name: 'preview-app',
            private: true,
            version: '0.0.0',
            type: 'module',
            scripts: {
              dev: 'vite --host 0.0.0.0 --port 3000',
              build: 'vite build',
              preview: 'vite preview --host 0.0.0.0 --port 3000',
            },
            dependencies: {
              react: '^18.3.1',
              'react-dom': '^18.3.1',
            },
            devDependencies: isTs
              ? {
                  vite: '^6.0.0',
                  typescript: '^5.0.0',
                  '@types/react': '^18.2.0',
                  '@types/react-dom': '^18.2.0',
                  '@vitejs/plugin-react': '^4.3.0',
                }
              : {
                  vite: '^6.0.0',
                  '@vitejs/plugin-react': '^4.3.0',
                },
          },
          null,
          2,
        );

      out['vite.config.ts'] =
        out['vite.config.ts'] ||
        [
          "import { defineConfig } from 'vite';",
          "import react from '@vitejs/plugin-react';",
          '',
          'export default defineConfig({',
          '  plugins: [react()],',
          '});',
          '',
        ].join('\n');
    }

    return out;
  }, [files]);

  const shouldUseDockerSandbox = useMemo(() => {
    // Sandpack runtime frequently fails on restricted networks (TIME_OUT),
    // and it can't run Next.js / multi-package stacks anyway.
    // Use Docker preview by default whenever the user is in Preview.
    return editorView === 'preview';
  }, [editorView]);

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
          <PreviewPane
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
