/**
 * Enhanced Preview Pane
 *
 * Fixed Sandpack integration with proper dependencies and z-index handling
 */

'use client';

import { SandpackProvider, SandpackPreview, SandpackLayout } from '@codesandbox/sandpack-react';
import { useGenerationStore } from '@/store/generation-store';
import { RefreshCw, Play, Maximize2, AlertCircle, Smartphone, Tablet, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);

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

      // Comprehensive list of common npm packages with versions
      const commonPackages: Record<string, string> = {
        // Core React
        'react': '^18.3.1',
        'react-dom': '^18.3.1',
        'react-router-dom': '^6.22.0',
        'react-hook-form': '^7.51.0',
        '@radix-ui/react-dialog': '^1.0.5',
        '@radix-ui/react-dropdown-menu': '^2.0.6',
        '@radix-ui/react-slot': '^1.0.2',
        '@radix-ui/react-tabs': '^1.0.4',
        '@radix-ui/react-toast': '^1.1.5',
        '@radix-ui/react-tooltip': '^1.0.7',
        '@radix-ui/react-select': '^2.0.0',
        '@radix-ui/react-popover': '^1.0.7',
        '@radix-ui/react-label': '^2.0.2',
        '@radix-ui/react-checkbox': '^1.0.4',
        '@radix-ui/react-switch': '^1.0.3',
        '@tanstack/react-query': '^5.28.0',
        'axios': '^1.6.8',
        'zustand': '^4.5.2',
        'jotai': '^2.7.3',
        'recoil': '^0.7.7',
        'sonner': '^1.4.3',
        'framer-motion': '^11.0.8',
        'class-variance-authority': '^0.7.0',
        'clsx': '^2.1.0',
        'tailwind-merge': '^2.2.2',
        'tailwindcss': '^3.4.1',
        'autoprefixer': '^10.4.18',
        'postcss': '^8.4.35',
        'date-fns': '^3.3.1',
        'dayjs': '^1.11.10',
        'lodash': '^4.17.21',
        'lodash-es': '^4.17.21',
        '@mui/material': '^5.15.14',
        '@mui/icons-material': '^5.15.14',
        '@mui/system': '^5.15.14',
        '@emotion/react': '^11.11.4',
        '@emotion/styled': '^11.11.4',
        '@chakra-ui/react': '^2.8.2',
        'next-themes': '^0.3.0',
        'next-auth': '^4.24.7',
        'next': '^14.1.4',
        'swr': '^2.2.5',
        'react-hot-toast': '^2.4.1',
        'react-icons': '^5.0.1',
        'lucide-react': '^0.363.0',
        'recharts': '^2.12.0',
        'chart.js': '^4.4.2',
        'react-chartjs-2': '^5.2.0',
        '@heroicons/react': '^2.1.1',
        'headlessui/react': '^1.7.18',
        'zod': '^3.22.4',
        'yup': '^1.3.3',
        'vitest': '^1.4.0',
        'jest': '^29.7.0',
        '@testing-library/react': '^14.2.1',
        '@testing-library/jest-dom': '^6.4.2',
        'playwright': '^1.42.1',
        'cypress': '^13.7.2',
        'typescript': '^5.4.3',
        '@types/react': '^18.2.55',
        '@types/react-dom': '^18.2.19',
        '@types/node': '^20.11.28',
        'vite': '^5.1.6',
        'eslint': '^8.57.0',
        'prettier': '^3.2.5',
        'uuid': '^9.0.1',
        'nanoid': '^5.0.5',
        'crypto-js': '^4.2.0',
        'bcrypt': '^5.1.1',
        'jsonwebtoken': '^9.0.2',
        'socket.io-client': '^4.7.2',
        'socket.io': '^4.7.2',
        'graphql': '^16.8.1',
        '@apollo/client': '^3.8.8',
        'react-table': '^7.8.0',
        '@tanstack/table': '^8.15.0',
        'react-select': '^5.8.0',
        'react-datepicker': '^6.1.0',
        'react-big-calendar': '^1.11.1',
        'react-dropzone': '^14.2.3',
        'wouter': '^3.12.0',
        'firebase': '^10.9.0',
        '@firebase/auth': '^1.7.5',
        '@firebase/firestore': '^4.6.5',
        '@stripe/stripe-js': '^3.4.0',
        '@stripe/react-stripe-js': '^2.4.0',
        'sharp': '^0.33.2',
        'papaparse': '^5.4.1',
        'xlsx': '^0.18.5',
        'pdf-lib': '^1.17.1',
        'jspdf': '^2.5.1',
        'qrcode.react': '^3.1.0',
        'react-qr-code': '^2.0.12',
        'styled-components': '^6.1.8',
        '@emotion/core': '^11.0.0',
        '@emotion/css': '^11.11.2',
        'antd': '^5.15.3',
      };

      importPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(code)) !== null) {
          const dep = match[1];
          // Only include npm packages (not relative imports)
          if (!dep.startsWith('.') && !dep.startsWith('/')) {
            const packageName = dep.split('/')[0]; // Get root package name
            if (!foundDeps[packageName]) {
              // Use known version or default to latest
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

  // Device mode configurations
  const deviceConfigs = {
    desktop: { width: '100%', maxWidth: '100%', label: 'Desktop' },
    tablet: { width: '768px', maxWidth: '100%', label: 'Tablet' },
    mobile: { width: '375px', maxWidth: '100%', label: 'Mobile' },
  };

  const currentDeviceConfig = deviceConfigs[deviceMode];

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
          {/* Device Mode Selector */}
          <div className="hidden sm:flex items-center bg-[var(--app-panel-2)] rounded-[6px] p-0.5 border border-[var(--app-border)]">
            <button
              onClick={() => setDeviceMode('mobile')}
              className={cn(
                "h-7 px-2 rounded-[4px] flex items-center gap-1.5 text-[10px] font-medium transition-colors",
                deviceMode === 'mobile'
                  ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                  : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              )}
              title="Mobile view (375px)"
            >
              <Smartphone className="h-3 w-3" />
            </button>
            <button
              onClick={() => setDeviceMode('tablet')}
              className={cn(
                "h-7 px-2 rounded-[4px] flex items-center gap-1.5 text-[10px] font-medium transition-colors",
                deviceMode === 'tablet'
                  ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                  : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              )}
              title="Tablet view (768px)"
            >
              <Tablet className="h-3 w-3" />
            </button>
            <button
              onClick={() => setDeviceMode('desktop')}
              className={cn(
                "h-7 px-2 rounded-[4px] flex items-center gap-1.5 text-[10px] font-medium transition-colors",
                deviceMode === 'desktop'
                  ? "bg-[var(--app-surface)] text-[var(--app-text)]"
                  : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              )}
              title="Desktop view"
            >
              <Monitor className="h-3 w-3" />
            </button>
          </div>
          <button
            className="h-8 w-8 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            onClick={handleRefresh}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </button>
          <button
            className="h-8 w-8 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Sandbox preview (iframe from Docker container) */}
      {forceSandbox ? (
        <div className="flex-1 min-h-0 relative bg-gray-100 flex items-center justify-center p-4">
          <div
            className="bg-white shadow-lg transition-all duration-300"
            style={{
              width: currentDeviceConfig.width,
              maxWidth: currentDeviceConfig.maxWidth,
              height: '100%'
            }}
          >
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
        </div>
      ) : (
        <>
        {/* Sandpack content (in-browser fallback) */}
        <div className="flex-1 min-h-0 bg-gray-100 flex items-center justify-center p-4">
          <div
            className="bg-white shadow-lg transition-all duration-300"
            style={{
              width: currentDeviceConfig.width,
              maxWidth: currentDeviceConfig.maxWidth,
              height: '100%'
            }}
          >
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
            <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Device:</span>
            <span className="text-[9px] font-semibold text-[var(--app-accent)]/75 uppercase">{currentDeviceConfig.label}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Size:</span>
            <span className="text-[9px] font-semibold text-[var(--app-text-muted)]">{deviceMode === 'desktop' ? 'Full' : currentDeviceConfig.width}</span>
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
