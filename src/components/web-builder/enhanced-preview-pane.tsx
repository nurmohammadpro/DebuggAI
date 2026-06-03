'use client';

import { useGenerationStore } from '@/store/generation-store';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Info,
  Maximize2,
  Minimize2,
  Monitor,
  Play,
  RefreshCw,
  Smartphone,
  Tablet,
  Zap,
  Container,
  Loader2,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { SandpackProvider, SandpackPreview, SandpackLayout } from '@codesandbox/sandpack-react';

interface EnhancedPreviewPaneProps {
  height?: string;
  className?: string;
  chromeless?: boolean;
  sandboxUrl?: string | null;
  onRefresh?: () => void;
  sandboxError?: string | null;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

const DEVICE_CONFIG: Record<DeviceMode, { width: string; label: string }> = {
  desktop: { width: '100%', label: 'Desktop' },
  tablet: { width: '768px', label: 'Tablet' },
  mobile: { width: '375px', label: 'Mobile' },
};

/**
 * v0.dev-style instant preview pane
 *
 * Primary: Sandpack (instant, in-browser bundler, shows immediately)
 * Upgrade: Docker (full Next.js environment, shown when ready)
 */
export function EnhancedPreviewPane({
  className,
  chromeless = false,
  sandboxUrl,
  onRefresh,
  sandboxError = null,
}: EnhancedPreviewPaneProps) {
  const { lastError, setLastError, files } = useGenerationStore();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useDocker, setUseDocker] = useState(false);
  const [sandpackLoaded, setSandpackLoaded] = useState(false);

  const currentDevice = DEVICE_CONFIG[deviceMode];
  const previewViewportClassName =
    deviceMode === 'desktop'
      ? 'flex-1 min-h-0 bg-[#F0F0F0] dark:bg-[#1A1A1A] flex items-stretch justify-stretch p-0'
      : 'flex-1 min-h-0 bg-[#F0F0F0] dark:bg-[#1A1A1A] flex items-center justify-center p-4';

  const handleRefresh = useCallback(() => {
    setLastError(null);
    setSandpackLoaded(false);
    onRefresh?.();
  }, [onRefresh, setLastError]);

  // Build Sandpack files from generation store
  const { sandpackFiles, sandpackTemplate, dependencies } = useMemo(() => {
    if (!files || Object.keys(files.files).length === 0) {
      return { sandpackFiles: undefined, sandpackTemplate: 'react' as const, dependencies: {} };
    }

    const isTs = Object.keys(files.files).some(p => p.endsWith('.ts') || p.endsWith('.tsx'));
    const result: Record<string, { code: string }> = {};
    const deps: Record<string, string> = {};

    const put = (path: string, code: string) => {
      result[path.startsWith('/') ? path : '/' + path] = { code };
    };

    // Track CSS files found — we'll inject imports if needed
    const cssFiles: string[] = [];

    // Check if any file already imports a CSS file
const cssAlreadyImported = (codes: string[]): boolean => {
  return codes.some(code => /import\s+['"].*\.css['"]/.test(code) || /import\s+['"].*\.scss['"]/.test(code));
};

// Detect packages from import statements
    const detectDeps = (code: string) => {
      const importPattern = /from\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = importPattern.exec(code)) !== null) {
        const dep = match[1];
        if (!dep.startsWith('.') && !dep.startsWith('/')) {
          const pkg = dep.split('/')[0];
          if (!deps[pkg]) deps[pkg] = 'latest';
        }
      }
    };

    // Phase 1: Collect all files and detect CSS
    for (const [path, file] of Object.entries(files.files)) {
      if (file.status === 'deleted') continue;
      const normalized = path.startsWith('/') ? path.slice(1) : path;
      detectDeps(file.content);

      const ext = normalized.split('.').pop()?.toLowerCase();
      if (ext === 'css' || ext === 'scss' || ext === 'sass') {
        cssFiles.push(normalized);
      }
    }

    // Phase 2: Map files to Sandpack paths
    let hasAppPage = false;
    let hasLayout = false;
    let layoutContent = '';

    for (const [path, file] of Object.entries(files.files)) {
      if (file.status === 'deleted') continue;
      const normalized = path.startsWith('/') ? path.slice(1) : path;
      const ext = normalized.split('.').pop()?.toLowerCase();

      // Track Next.js App Router patterns
      if (normalized === 'app/page.tsx' || normalized === 'app/page.jsx') {
        hasAppPage = true;
      }
      if (normalized === 'app/layout.tsx' || normalized === 'app/layout.jsx') {
        hasLayout = true;
        layoutContent = file.content;
      }

      // Map CSS files — use /styles.css for the primary CSS (Sandpack auto-includes it)
      if (ext === 'css' || ext === 'scss' || ext === 'sass') {
        if (
          normalized === 'app/globals.css' ||
          normalized === 'src/app/globals.css' ||
          normalized === 'styles.css' ||
          normalized === 'src/styles.css' ||
          normalized === 'index.css' ||
          normalized === 'App.css'
        ) {
          put('/styles.css', file.content);
        } else if (normalized.endsWith('.module.css') || normalized.endsWith('.module.scss')) {
          // CSS modules — preserve path for named imports
          put('/' + normalized.replace(/^app\//, ''), file.content);
        } else {
          put('/' + normalized, file.content);
        }
        continue;
      }

      // Map component files to Sandpack-friendly paths
      if (normalized === 'src/App.tsx' || normalized === 'App.tsx' || normalized === 'src/App.jsx' || normalized === 'App.jsx') {
        put('/App.tsx', file.content);
      } else if (normalized === 'app/page.tsx' || normalized === 'app/page.jsx') {
        // Next.js app/page -> standalone App component
        let code = file.content;
        // Remove 'use client' directive if present (Sandpack doesn't need it)
        code = code.replace(/^['"]use client['"];?\s*\n?/gm, '');
        // Convert `export default function Page` -> `export default function App`
        code = code.replace(/export default function (\w+)/, 'export default function App');
        // Convert `export default function page` -> `export default function App`
        code = code.replace(/export default function page/, 'export default function App');
        put('/App.tsx', code);
      } else if (normalized === 'src/index.tsx' || normalized === 'src/index.jsx') {
        put('/index.tsx', file.content);
      } else if (normalized === 'app/layout.tsx' || normalized === 'app/layout.jsx') {
        // Next.js layout — extract CSS imports, keep as regular component
        let code = file.content;
        code = code.replace(/^['"]use client['"];?\s*\n?/gm, '');
        // Remove Next.js metadata config — Sandpack doesn't support it
        code = code.replace(/export (const|let) metadata[\s\S]*?;?\n?/gm, '');
        code = code.replace(/export (const|let) generateMetadata[\s\S]*?}[\s\S]*?}[\s\S]*?;?\n?/gm, '');
        put('/layout.tsx', code);
      } else {
        // All other files — preserve path but strip src/ prefix for Sandpack
        const spPath = normalized.startsWith('src/') ? normalized.slice(4) : normalized;
        put('/' + spPath, file.content);
      }
    }

    // Phase 3: Synthesize index file if missing
    const needsIndex = !result['/index.js'] && !result['/index.jsx'] && !result['/index.ts'] && !result['/index.tsx'];
    if (needsIndex) {
      const hasApp = !!(result['/App.tsx'] || result['/App.jsx']);
      if (hasApp) {
        // Build import statements
        const imports: string[] = [];
        const cssImport = result['/styles.css'] ? "import './styles.css';" : null;
        if (cssImport) imports.push(cssImport);
        if (isTs) imports.push("import React from 'react';");
        imports.push("import ReactDOM from 'react-dom/client';");
        imports.push("import App from './App';");

        put('/index.tsx', [
          ...imports,
          '',
          "const root = ReactDOM.createRoot(document.getElementById('root')!);",
          "root.render(<React.StrictMode><App /></React.StrictMode>);",
        ].join('\n'));
      }
    }

    // Phase 4: Ensure CSS is imported somewhere
    if (result['/styles.css'] && !cssAlreadyImported(Object.values(result).map(r => r.code))) {
      // Inject CSS import into the index file
      if (result['/index.tsx']) {
        result['/index.tsx'].code = "import './styles.css';\n" + result['/index.tsx'].code;
      } else if (result['/App.tsx']) {
        result['/App.tsx'].code = "import './styles.css';\n" + result['/App.tsx'].code;
      }
    }

    // Add React deps if not detected
    if (!deps['react']) deps['react'] = '^18.3.1';
    if (!deps['react-dom']) deps['react-dom'] = '^18.3.1';

    const template: 'react' | 'react-ts' = isTs ? 'react-ts' : 'react';
    return { sandpackFiles: result, sandpackTemplate: template, dependencies: deps };
  }, [files]);

  const hasFiles = files && Object.keys(files.files).filter(p => files.files[p]?.status !== 'deleted').length > 0;
  const dockerReady = !!sandboxUrl && !sandboxError;
  const showDocker = useDocker && dockerReady;

  return (
    <div
      className={cn(
        'flex flex-col bg-[var(--app-panel)] flex-1 min-h-0',
        isFullscreen && 'fixed inset-0 z-50',
        className
      )}
    >
      {!chromeless && (
        <PreviewHeader
          deviceMode={deviceMode}
          setDeviceMode={setDeviceMode}
          onRefresh={handleRefresh}
          isFullscreen={isFullscreen}
          setIsFullscreen={setIsFullscreen}
          hasError={!!lastError || !!sandboxError}
          useDocker={showDocker}
          dockerReady={dockerReady}
          onToggleEngine={() => {
            setUseDocker(!useDocker);
            if (!useDocker && dockerReady) setSandpackLoaded(false);
          }}
        />
      )}

      <div className={previewViewportClassName}>
        <div
          className="bg-white rounded-[4px] shadow-lg overflow-hidden transition-all duration-300 flex flex-col flex-1 min-h-0"
          style={{ width: currentDevice.width, maxWidth: '100%' }}
        >
          {sandboxError && showDocker ? (
            /* Docker error state */
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0">
                <SandpackPreviewShell
                  files={sandpackFiles}
                  template={sandpackTemplate}
                  deps={dependencies}
                  onLoad={() => setSandpackLoaded(true)}
                />
              </div>
              <div className="px-3 py-1.5 bg-[var(--app-danger-soft)] border-t border-[var(--app-danger)]/20 shrink-0">
                <p className="text-[10px] text-[var(--app-danger)] flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" />
                  Docker preview failed — showing Sandpack fallback
                </p>
              </div>
            </div>
          ) : showDocker ? (
            /* Docker iframe (upgraded) */
            <iframe
              src={sandboxUrl}
              className="h-full w-full border-0"
              title="Docker Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          ) : !hasFiles ? (
            /* Empty state — no code generated yet */
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--app-bg)] p-8">
              <Zap className="h-12 w-12 text-[var(--app-text-dim)] mb-4 opacity-20" />
              <p className="text-sm text-[var(--app-text)] mb-1 font-medium">Preview</p>
              <p className="text-xs text-[var(--app-text-muted)] text-center max-w-[240px] leading-relaxed">
                Ask the AI to generate code and your preview will appear here instantly.
              </p>
            </div>
          ) : (
            /* INSTANT Sandpack preview (primary engine) */
            <SandpackPreviewShell
              files={sandpackFiles}
              template={sandpackTemplate}
              deps={dependencies}
              onLoad={() => setSandpackLoaded(true)}
            />
          )}
        </div>
      </div>

      {lastError && (
        <div className="border-t border-[var(--app-danger)]/25 p-3 bg-[var(--app-danger-soft)] shrink-0">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--app-danger)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--app-danger)] uppercase tracking-wider mb-1">
                Runtime Error
              </p>
              <p className="text-[12px] text-[var(--app-text)] font-mono leading-relaxed break-words">
                {lastError.message}
              </p>
            </div>
            <button
              onClick={() => setLastError(null)}
              className="text-[10px] uppercase font-semibold text-[var(--app-danger)] hover:opacity-75 transition-opacity px-2 py-1 rounded shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <PreviewStatusBar
        deviceMode={deviceMode}
        engine={showDocker ? 'Docker/Next.js' : 'Sandpack React'}
        sandpackLoaded={sandpackLoaded}
      />
    </div>
  );
}

/**
 * Sandpack preview shell — the instant, in-browser bundler
 */
function SandpackPreviewShell({
  files,
  template,
  deps,
  onLoad,
}: {
  files: Record<string, { code: string }> | undefined;
  template: 'react' | 'react-ts';
  deps: Record<string, string>;
  onLoad: () => void;
}) {
  if (!files || Object.keys(files).length === 0) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center bg-[var(--app-bg)]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-6 w-6 text-[var(--app-text-dim)] animate-spin" />
          <span className="text-[10px] text-[var(--app-text-dim)]">Bundling...</span>
        </div>
      </div>
    );
  }

  return (
    <SandpackProvider
      key={JSON.stringify(Object.keys(files))}
      template={template}
      files={files}
      customSetup={{ dependencies: deps }}
      options={{
        recompileMode: 'delayed',
        recompileDelay: 300,
        initMode: 'immediate',
      }}
    >
      <SandpackLayout>
        <SandpackPreview
          style={{ height: '100%', width: '100%', border: 'none' }}
          showNavigator={false}
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          onLoad={onLoad}
        />
      </SandpackLayout>
    </SandpackProvider>
  );
}

function PreviewHeader({
  deviceMode,
  setDeviceMode,
  onRefresh,
  isFullscreen,
  setIsFullscreen,
  hasError,
  useDocker,
  dockerReady,
  onToggleEngine,
}: {
  deviceMode: DeviceMode;
  setDeviceMode: (m: DeviceMode) => void;
  onRefresh: () => void;
  isFullscreen: boolean;
  setIsFullscreen: (v: boolean) => void;
  hasError: boolean;
  useDocker: boolean;
  dockerReady: boolean;
  onToggleEngine: () => void;
}) {
  return (
    <div className="h-11 flex items-center gap-1.5 px-3 shrink-0 border-b border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex items-center gap-2.5">
        <Play className="h-3.5 w-3.5 text-[var(--app-accent)]" />
        <h3 className="text-[13px] font-semibold tracking-tight uppercase text-[var(--app-text)]">
          Preview
        </h3>
        {hasError && (
          <span className="inline-flex text-[9px] h-4 px-1.5 uppercase font-black rounded-[6px] bg-[var(--app-danger-soft)] text-[var(--app-danger)]">
            Error
          </span>
        )}
        <span className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider',
          useDocker
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : dockerReady
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
        )}>
          {useDocker ? (
            <><Container className="h-2.5 w-2.5" /> Docker</>
          ) : (
            <><Zap className="h-2.5 w-2.5" /> Instant</>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-2">
        <button
          onClick={() => setDeviceMode('desktop')}
          className={cn(
            'h-7 w-7 rounded-[5px] flex items-center justify-center transition-colors',
            deviceMode === 'desktop'
              ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
              : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
          )}
          title="Desktop"
        >
          <Monitor className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setDeviceMode('tablet')}
          className={cn(
            'h-7 w-7 rounded-[5px] flex items-center justify-center transition-colors',
            deviceMode === 'tablet'
              ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
              : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
          )}
          title="Tablet"
        >
          <Tablet className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setDeviceMode('mobile')}
          className={cn(
            'h-7 w-7 rounded-[5px] flex items-center justify-center transition-colors',
            deviceMode === 'mobile'
              ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
              : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
          )}
          title="Mobile"
        >
          <Smartphone className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Docker upgrade toggle */}
      {dockerReady && !useDocker && (
        <button
          onClick={onToggleEngine}
          className="ml-2 h-6 px-2 rounded-[4px] border border-emerald-500/20 bg-emerald-500/5 text-[9px] font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1"
          title="Upgrade to Docker preview"
        >
          <Container className="h-2.5 w-2.5" />
          Docker
        </button>
      )}

      {useDocker && (
        <button
          onClick={onToggleEngine}
          className="ml-2 h-6 px-2 rounded-[4px] border border-blue-500/20 bg-blue-500/5 text-[9px] font-semibold text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-1"
          title="Switch to instant preview"
        >
          <Zap className="h-2.5 w-2.5" />
          Instant
        </button>
      )}

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <button
          onClick={onRefresh}
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
      </div>
    </div>
  );
}

function PreviewStatusBar({
  deviceMode,
  engine,
  sandpackLoaded,
}: {
  deviceMode: DeviceMode;
  engine: string;
  sandpackLoaded?: boolean;
}) {
  return (
    <div className="h-6 border-t border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Engine:</span>
          <span className="text-[9px] font-semibold text-[var(--app-accent)]/75 uppercase">{engine}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Mode:</span>
          <span className="text-[9px] font-semibold text-[var(--app-accent)]/75 uppercase">{deviceMode}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {sandpackLoaded && (
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[9px] text-emerald-400/70 uppercase tracking-widest">Live</span>
          </div>
        )}
      </div>
    </div>
  );
}
