/**
 * Enhanced Preview Pane
 *
 * Fixed Sandpack integration with proper dependencies and z-index handling
 */

'use client';

import { SandpackProvider, SandpackPreview, SandpackLayout } from '@codesandbox/sandpack-react';
import { useGenerationStore } from '@/store/generation-store';
import { RefreshCw, Play, Maximize2, AlertCircle } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

interface EnhancedPreviewPaneProps {
  height?: string;
  className?: string;
  chromeless?: boolean;
  sandboxUrl?: string | null;
  onRefresh?: () => void;
  forceSandbox?: boolean;
  sandboxError?: string | null;
}

export function EnhancedPreviewPane({
  height = '600px',
  className,
  chromeless = false,
  sandboxUrl,
  onRefresh,
  forceSandbox = false,
  sandboxError = null,
}: EnhancedPreviewPaneProps) {
  const {
    files,
    currentCode,
    lastError,
    setLastError
  } = useGenerationStore();
  const { resolvedTheme } = useTheme();
  const [nonce, setNonce] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const { sandpackFiles, sandpackTemplate, dependencies } = useMemo(() => {
    if (!files) return {
      sandpackFiles: undefined,
      sandpackTemplate: 'react' as const,
      dependencies: {}
    };

    const isTs =
      Object.keys(files.files).some((p) => p.endsWith('.ts') || p.endsWith('.tsx'));

    // Sandpack templates use flat /App.(js|tsx) and /index.(js|tsx) files.
    // Our generator often writes under src/, so map common paths.
    const result: Record<string, { code: string }> = {};
    const deps: Record<string, string> = {};

    const put = (path: string, code: string) => {
      const key = path.startsWith('/') ? path : '/' + path;
      result[key] = { code };
    };

    // Detect commonly used packages from file contents
    const detectDependencies = (code: string) => {
      // Match import statements to detect dependencies
      const importPatterns = [
        /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
        /require\(['"]([^'"]+)['"]\)/g,
      ];

      const foundDeps: Record<string, string> = {};

      importPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(code)) !== null) {
          const dep = match[1];
          // Only include npm packages (not relative imports)
          if (!dep.startsWith('.') && !dep.startsWith('/')) {
            const packageName = dep.split('/')[0]; // Get root package name
            if (!foundDeps[packageName]) {
              // Add common packages with their versions
              const commonPackages: Record<string, string> = {
                'lucide-react': '^0.263.1',
                'react': '^18.2.0',
                'react-dom': '^18.2.0',
                '@mui/material': '^5.14.0',
                '@tanstack/react-query': '^4.0.0',
                'axios': '^1.4.0',
                'zustand': '^4.0.0',
                'sonner': '^1.0.0',
                'tailwindcss': '^3.3.0',
                'clsx': '^2.0.0',
                'date-fns': '^2.30.0',
              };
              foundDeps[packageName] = commonPackages[packageName] || 'latest';
            }
          }
        }
      });

      return foundDeps;
    };

    for (const [path, file] of Object.entries(files.files)) {
      if (file.status === 'deleted') continue;
      const normalized = path.startsWith('/') ? path.slice(1) : path;

      // Detect dependencies from file content
      const fileDeps = detectDependencies(file.content);
      Object.assign(deps, fileDeps);

      // Map src/App.* to /App.* so the template entry imports pick it up.
      if (normalized === 'src/App.tsx') put('/App.tsx', file.content);
      else if (normalized === 'src/App.ts') put('/App.ts', file.content);
      else if (normalized === 'src/App.jsx') put('/App.jsx', file.content);
      else if (normalized === 'src/App.js') put('/App.js', file.content);
      else if (normalized === 'src/index.tsx') put('/index.tsx', file.content);
      else if (normalized === 'src/index.ts') put('/index.ts', file.content);
      else if (normalized === 'src/index.jsx') put('/index.jsx', file.content);
      else if (normalized === 'src/index.js') put('/index.js', file.content);
      else put('/' + normalized, file.content);
    }

    // If we only have an App file, synthesize a minimal index so Sandpack can boot.
    if (!result['/index.js'] && !result['/index.jsx'] && !result['/index.ts'] && !result['/index.tsx']) {
      if (result['/App.tsx'] || result['/App.ts']) {
        put(
          '/index.tsx',
          [
            "import React from 'react';",
            "import ReactDOM from 'react-dom/client';",
            "import App from './App';",
            '',
            "const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);",
            'root.render(',
            '  <React.StrictMode>',
            '    <App />',
            '  </React.StrictMode>',
            ');',
            '',
          ].join('\n'),
        );
      } else if (result['/App.jsx'] || result['/App.js']) {
        put(
          '/index.js',
          [
            "import React from 'react';",
            "import { createRoot } from 'react-dom/client';",
            "import App from './App';",
            '',
            "const root = createRoot(document.getElementById('root'));",
            'root.render(',
            '  <React.StrictMode>',
            '    <App />',
            '  </React.StrictMode>',
            ');',
            '',
          ].join('\n'),
        );
      }
    }

    const template: 'react' | 'react-ts' = isTs ? 'react-ts' : 'react';
    return { sandpackFiles: result, sandpackTemplate: template, dependencies: deps };
  }, [files, currentCode]);

  const handleRefresh = () => {
    setIsLoading(true);
    setNonce(n => n + 1);
    setLastError(null);
    onRefresh?.();
  };

  return (
    <div
      className={cn(
        "overflow-hidden flex flex-col border border-[var(--app-border)] bg-[var(--app-panel)] rounded-[6px]",
        className
      )}
      style={{ height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-panel-2)] px-4 h-12 shrink-0 z-10 relative">
        <div className="flex items-center gap-2.5">
          <Play className="h-3.5 w-3.5 text-[var(--app-accent)]" />
          <h3 className="text-[13px] font-semibold tracking-tight uppercase text-[var(--app-text)]">Live Preview</h3>
          {lastError && (
            <span className="inline-flex text-[9px] h-4 px-1.5 uppercase font-black rounded-[6px] bg-[var(--app-danger-soft)] text-[var(--app-danger)]">
              Runtime Error
            </span>
          )}
          {!isLoading && !lastError && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[var(--app-success-soft)] border border-[var(--app-success)]/20 animate-in fade-in duration-500">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-success)] animate-pulse" />
              <span className="text-[10px] font-semibold text-[var(--app-success)] uppercase tracking-widest">Active</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="h-8 w-8 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            onClick={handleRefresh}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </button>
          <button
            className="h-8 w-8 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Sandbox preview (iframe from Docker container) */}
      {forceSandbox ? (
        <div className="flex-1 min-h-0 relative bg-white">
          {sandboxError ? (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--app-bg)] p-6 text-center">
              <div className="text-[12px] font-semibold text-[var(--app-danger)] mb-2">Preview Failed</div>
              <div className="text-[11px] text-[var(--app-text-dim)] max-w-[520px] mb-4 break-words">
                {sandboxError}
              </div>
              {onRefresh && (
                <button
                  className="h-8 px-3 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[11px] font-semibold uppercase tracking-tight hover:bg-[var(--app-panel-2)]"
                  onClick={onRefresh}
                >
                  Retry
                </button>
              )}
            </div>
          ) : sandboxUrl ? (
            <iframe
              src={sandboxUrl}
              className="w-full h-full border-0"
              title="Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--app-bg)] animate-in fade-in duration-500">
              <div className="relative mb-8">
                <div className="w-16 h-16 rounded-[6px] border-2 border-[var(--app-accent)]/25 animate-spin [animation-duration:3s]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-6 w-6 text-[var(--app-accent)] animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--app-accent)] uppercase tracking-[0.3em] animate-pulse">Starting Docker Sandbox</span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
        {/* Sandpack content (in-browser fallback) */}
        <div className="flex-1 min-h-0 bg-white relative">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--app-bg)] animate-in fade-in duration-500">
              <div className="relative mb-8">
                <div className="w-16 h-16 rounded-[6px] border-2 border-[var(--app-accent)]/25 animate-spin [animation-duration:3s]" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-6 w-6 text-[var(--app-accent)] animate-pulse" />
                </div>
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[11px] font-semibold text-[var(--app-accent)] uppercase tracking-[0.3em] animate-pulse">Initializing Sandbox</span>
                <div className="flex gap-1">
                  <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <SandpackProvider
            key={nonce}
            template={sandpackTemplate}
            theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
            files={sandpackFiles}
            dependencies={dependencies}
            options={{
              recompileMode: 'delayed',
              recompileDelay: 500,
              externalResources: [],
            }}
          >
            <SandpackLayout>
              <SandpackPreview
                style={{ height: '100%', border: 'none', width: '100%' }}
                showNavigator={false}
                showOpenInCodeSandbox={false}
                showRefreshButton={false}
                onLoad={() => setIsLoading(false)}
              />
            </SandpackLayout>
          </SandpackProvider>
        </div>
        </>
      )}

      {/* Status Bar */}
      <div className="h-6 border-t border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 flex items-center justify-between shrink-0 z-10 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Engine:</span>
            <span className="text-[9px] font-semibold text-[var(--app-accent)]/75 uppercase">React v18</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Port:</span>
            <span className="text-[9px] font-semibold text-[var(--app-accent)]/75 uppercase">3000</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-widest">Sandbox-V2-Isolated</span>
        </div>
      </div>

      {/* Error Display */}
      {lastError && (
        <div className="border-t border-[var(--app-danger)]/20 p-4 bg-[var(--app-danger-soft)] shrink-0 z-10 relative">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-[var(--app-danger)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-[var(--app-danger)] uppercase tracking-wider mb-1">Runtime Error</h4>
              <p className="text-[13px] text-[var(--app-text)]/90 font-mono leading-relaxed">{lastError.message}</p>
              {lastError.lineno && (
                <p className="text-xs text-[var(--app-text-dim)] mt-2 font-mono">
                  at line {lastError.lineno}{lastError.colno && `:${lastError.colno}`}
                </p>
              )}
            </div>
            <button
              onClick={() => setLastError(null)}
              className="h-6 text-[10px] uppercase font-semibold text-[var(--app-danger)] hover:bg-[var(--app-danger-soft)] rounded-[6px] px-2 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
