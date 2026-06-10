'use client';

import { useGenerationStore } from '@/store/generation-store';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Container,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  Play,
  RefreshCw,
  Smartphone,
  Tablet,
  Zap,
  Code2,
  Cpu,
  FileCode,
  Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';

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
 *
 * CSS strategy: ALL CSS files are concatenated into /styles.css
 * which Sandpack auto-includes in every template.
 */
export function EnhancedPreviewPane({
  className,
  chromeless = false,
  sandboxUrl,
  onRefresh,
  sandboxError = null,
}: EnhancedPreviewPaneProps) {
  const { lastError, setLastError, files, isGenerating } = useGenerationStore();
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [useDocker, setUseDocker] = useState(false);
  const [sandpackLoaded, setSandpackLoaded] = useState(false);
  const wasGeneratingRef = useRef(false);

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

  // ── Build Sandpack files from generation store ─────────────────────────
  const { sandpackFiles, sandpackTemplate, dependencies } = useMemo(() => {
    if (!files || Object.keys(files.files).length === 0) {
      return { sandpackFiles: undefined, sandpackTemplate: 'react' as const, dependencies: {} };
    }

    const isTs = Object.keys(files.files).some(p => p.endsWith('.ts') || p.endsWith('.tsx'));
    const result: Record<string, { code: string }> = {};
    const deps: Record<string, string> = {};
    const cssParts: string[] = [];

    const put = (path: string, code: string) => {
      const key = path.startsWith('/') ? path : '/' + path;
      result[key] = { code };
    };

    // Detect npm packages from import statements
    // Skip react, react-dom, @types/react, @types/react-dom — already provided by the Sandpack template.
    // Using 'latest' or a different version creates a duplicate React instance,
    // causing "ReactCurrentDispatcher" errors when the template-bundled react-dom
    // can't find the correct React internals.
    const TEMPLATE_PROVIDED = new Set(['react', 'react-dom', '@types/react', '@types/react-dom']);
    const detectDeps = (code: string) => {
      const re = /from\s+['"]([^'"]+)['"]/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code)) !== null) {
        const dep = m[1];
        if (!dep.startsWith('.') && !dep.startsWith('/')) {
          const pkg = dep.split('/')[0]!;
          // Normalize scoped packages (e.g. @types/react → @types/react)
          const scoped = dep.startsWith('@') ? dep.split('/').slice(0, 2).join('/') : pkg;
          if (!TEMPLATE_PROVIDED.has(scoped) && !deps[scoped]) {
            deps[scoped] = 'latest';
          }
        }
      }
    };

    // PASS 1 — collect CSS content + detect deps
    for (const [path, file] of Object.entries(files.files)) {
      if (file.status === 'deleted') continue;
      const normalized = path.startsWith('/') ? path.slice(1) : path;
      detectDeps(file.content);
      const ext = normalized.split('.').pop()?.toLowerCase();
      if (ext === 'css' || ext === 'scss' || ext === 'sass') {
        cssParts.push(`/* === ${normalized} === */\n${file.content}`);
      }
    }

    // Write consolidated CSS bundle
    if (cssParts.length > 0) {
      put('/styles.css', cssParts.join('\n\n'));
    }

    // PASS 2 — map component files to Sandpack paths
    for (const [path, file] of Object.entries(files.files)) {
      if (file.status === 'deleted') continue;
      const normalized = path.startsWith('/') ? path.slice(1) : path;
      const ext = normalized.split('.').pop()?.toLowerCase();

      if (ext === 'css' || ext === 'scss' || ext === 'sass') continue;

      if (normalized === 'src/App.tsx' || normalized === 'App.tsx' ||
          normalized === 'src/App.jsx' || normalized === 'App.jsx') {
        put('/App.tsx', file.content);
      } else if (normalized === 'app/page.tsx' || normalized === 'app/page.jsx') {
        let code = file.content;
        // Strip 'use client' — Sandpack is client-only
        code = code.replace(/^['"]use client['"];?\s*\n?/gm, '');
        // Remove Next.js metadata exports
        code = code.replace(/export\s+(?:const|let)\s+metadata[\s\S]*?;?\n/gm, '');
        code = code.replace(/export\s+(?:const|let)\s+generateMetadata[\s\S]*?\};[\s\S]*?\};?\n/gm, '');
        // Normalize all export patterns to ensure a renderable default export:
        // Named function: export default function Page() → export default function App()
        code = code.replace(/export\s+default\s+function\s+(?!App\b)(\w+)/g, 'export default function App');
        // Class: export default class Page → export default class App
        code = code.replace(/export\s+default\s+class\s+(?!App\b)(\w+)/g, 'export default class App');
        // Variable: export default const Page = → const Page = ...
        // then the existing `export default Page` line stays
        code = code.replace(/export\s+default\s+(const|let)\s+(\w+)/g, (_, kw, name) => `${kw} ${name}`);
        // If no default export exists, find the component name and add one
        if (!/export\s+default\s/.test(code)) {
          const fnMatch = code.match(/(?:export\s+)?function\s+(\w+)/);
          const constMatch = code.match(/(?:export\s+)?const\s+(\w+)\s*=\s*(?:\(|React\.memo)/);
          const compName = fnMatch?.[1] || constMatch?.[1] || 'Page';
          code += `\nexport default ${compName};\n`;
        }
        put('/App.tsx', code);
      } else if (normalized === 'src/index.tsx' || normalized === 'src/index.jsx') {
        put('/index.tsx', file.content);
      } else if (normalized === 'app/layout.tsx' || normalized === 'app/layout.jsx') {
        let code = file.content;
        code = code.replace(/^['"]use client['"];?\s*\n?/gm, '');
        code = code.replace(/export (const|let) metadata[\s\S]*?;?\n?/gm, '');
        code = code.replace(/export (const|let) generateMetadata[\s\S]*?\};[\s\S]*?\};?\n?/gm, '');
        put('/layout.tsx', code);
      } else {
        const spPath = normalized.startsWith('src/') ? normalized.slice(4) : normalized;
        put('/' + spPath, file.content);
      }
    }

    // PASS 3 — synthesize entry point if needed
    if (!result['/index.js'] && !result['/index.jsx'] && !result['/index.ts'] && !result['/index.tsx']) {
      if (result['/App.tsx'] || result['/App.jsx']) {
        const lines: string[] = [];
        if (result['/styles.css']) lines.push("import './styles.css';");
        if (isTs) lines.push("import React from 'react';");
        lines.push("import ReactDOM from 'react-dom/client';");
        lines.push("import App from './App';");
        lines.push('');
        lines.push("const root = ReactDOM.createRoot(document.getElementById('root')!);");
        lines.push("root.render(<React.StrictMode><App /></React.StrictMode>);");
        put('/index.tsx', lines.join('\n'));
      }
    } else {
      const idxKey = Object.keys(result).find(k => k.startsWith('/index.'));
      if (idxKey && result['/styles.css'] && !result[idxKey]!.code.includes("import './styles.css'")) {
        result[idxKey]!.code = "import './styles.css';\n" + result[idxKey]!.code;
      }
    }

    // PASS 4 — last-resort: inject CSS into App if index didn't get it
    if (result['/styles.css']) {
      const appKey = Object.keys(result).find(k => k.startsWith('/App.'));
      if (appKey && !result[appKey]!.code.includes("import './styles.css'")) {
        const idxHasCss = Object.keys(result)
          .filter(k => k.startsWith('/index.'))
          .some(k => result[k]!.code.includes("import './styles.css'"));
        if (!idxHasCss) {
          result[appKey]!.code = "import './styles.css';\n" + result[appKey]!.code;
        }
      }
    }

    // react and react-dom are already provided by the Sandpack template —
    // do NOT add them as explicit deps (would cause version conflicts).

    const template: 'react' | 'react-ts' = isTs ? 'react-ts' : 'react';
    return { sandpackFiles: result, sandpackTemplate: template, dependencies: deps };
  }, [files]);

  const hasFiles = files && Object.keys(files.files).filter(p => files.files[p]?.status !== 'deleted').length > 0;
  const dockerReady = !!sandboxUrl && !sandboxError;
  const showDocker = useDocker && dockerReady;

  // Track generation completion to auto-render preview
  const [showTransition, setShowTransition] = useState(false);
  useEffect(() => {
    if (!isGenerating && wasGeneratingRef.current && hasFiles) {
      setShowTransition(true);
      const timer = setTimeout(() => {
        setShowTransition(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
    wasGeneratingRef.current = isGenerating;
  }, [isGenerating, hasFiles]);

  const showBuildingAnimation = isGenerating || (!hasFiles && !isGenerating) || showTransition;

  return (
    <div
      className={cn(
        'flex flex-col bg-[var(--app-panel)] flex-1 min-h-0',
        isFullscreen && 'fixed inset-0 z-50',
        className,
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
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0">
                <SandpackPreviewShell files={sandpackFiles} template={sandpackTemplate} deps={dependencies} onLoad={() => setSandpackLoaded(true)} />
              </div>
              <div className="px-3 py-1.5 bg-[var(--app-danger-soft)] border-t border-[var(--app-danger)]/20 shrink-0">
                <p className="text-[10px] text-[var(--app-danger)] flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" />
                  Docker preview failed — showing Sandpack fallback
                </p>
              </div>
            </div>
          ) : showDocker ? (
            <iframe
              src={sandboxUrl}
              className="h-full w-full border-0"
              title="Docker Live Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          ) : showBuildingAnimation ? (
            <BuildingAnimation isGenerating={isGenerating} fileCount={hasFiles ? Object.keys(files?.files || {}).filter(p => files?.files?.[p]?.status !== 'deleted').length : 0} />
          ) : (
            <SandpackPreviewShell files={sandpackFiles} template={sandpackTemplate} deps={dependencies} onLoad={() => setSandpackLoaded(true)} />
          )}
        </div>
      </div>

      {lastError && (
        <div className="border-t border-[var(--app-danger)]/25 p-3 bg-[var(--app-danger-soft)] shrink-0">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--app-danger)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--app-danger)] uppercase tracking-wider mb-1">Runtime Error</p>
              <p className="text-[12px] text-[var(--app-text)] font-mono leading-relaxed break-words">{lastError.message}</p>
            </div>
            <button onClick={() => setLastError(null)} className="text-[10px] uppercase font-semibold text-[var(--app-danger)] hover:opacity-75 transition-opacity px-2 py-1 rounded shrink-0">Dismiss</button>
          </div>
        </div>
      )}

      <PreviewStatusBar deviceMode={deviceMode} engine={showDocker ? 'Docker/Next.js' : 'Sandpack React'} sandpackLoaded={sandpackLoaded} />
    </div>
  );
}

// ── Building Animation ───────────────────────────────────────────────────
function BuildingAnimation({ isGenerating, fileCount }: { isGenerating: boolean; fileCount: number }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isGenerating) {
      setPhase(3);
      return;
    }
    const interval = setInterval(() => {
      setPhase(p => (p + 1) % 4);
    }, 2000);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const phases = [
    { icon: Wand2, label: 'Analyzing your request...', color: 'text-purple-400', bg: 'bg-purple-500/5' },
    { icon: Cpu, label: 'Architecting components...', color: 'text-blue-400', bg: 'bg-blue-500/5' },
    { icon: FileCode, label: 'Writing code files...', color: 'text-amber-400', bg: 'bg-amber-500/5' },
    { icon: Code2, label: isGenerating ? 'Polishing the details...' : `Built ${fileCount} file${fileCount !== 1 ? 's' : ''}`, color: 'text-emerald-400', bg: 'bg-emerald-500/5' },
  ];

  const current = phases[phase % 4]!;
  const Icon = current.icon;

  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--app-bg)] p-8">
      <div className="relative mb-8">
        <div className={cn(
          'w-20 h-20 rounded-2xl border-2 flex items-center justify-center',
          isGenerating ? 'animate-spin [animation-duration:4s] border-[var(--app-accent)]/20' : 'border-emerald-500/20'
        )}>
          <div className={cn(
            'w-16 h-16 rounded-xl flex items-center justify-center',
            current.bg
          )}>
            <Icon className={cn('h-7 w-7', current.color, isGenerating && 'animate-pulse')} />
          </div>
        </div>
        {isGenerating && (
          <>
            <div className="absolute inset-0 rounded-2xl border border-[var(--app-accent)]/10 animate-ping [animation-duration:2s]" />
            <div className="absolute -inset-1 rounded-2xl border border-[var(--app-accent)]/5 animate-ping [animation-duration:3s] [animation-delay:0.5s]" />
          </>
        )}
        {!isGenerating && (
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center animate-in zoom-in duration-300">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <span className={cn(
          'text-[13px] font-semibold transition-colors duration-500',
          current.color
        )}>
          {current.label}
        </span>
        {isGenerating && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-[10px] text-[var(--app-text-dim)] uppercase tracking-[0.2em]">Your app is coming up</span>
            <span className="flex gap-0.5 ml-1">
              <span className="w-1 h-1 rounded-full bg-[var(--app-accent)]/40 animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-1 rounded-full bg-[var(--app-accent)]/40 animate-bounce [animation-delay:150ms]" />
              <span className="w-1 h-1 rounded-full bg-[var(--app-accent)]/40 animate-bounce [animation-delay:300ms]" />
            </span>
          </div>
        )}
        {!isGenerating && fileCount > 0 && (
          <span className="text-[10px] text-[var(--app-text-dim)] uppercase tracking-[0.15em] mt-1 animate-in fade-in duration-500">
            Ready — rendering preview
          </span>
        )}
      </div>
    </div>
  );
}

// ── SandpackPreviewShell ──────────────────────────────────────────────────
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
      options={{ recompileMode: 'delayed', recompileDelay: 300, initMode: 'immediate' }}
    >
      {/* Bypass SandpackLayout — it uses height:100% which collapses in
          flex parents. Instead, use a flex-1 container that forces the
          SandpackPreview to fill the available space via absolute positioning. */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, position: 'relative' }}>
        <SandpackPreview
          className="!absolute !inset-0"
          style={{ height: '100%', width: '100%', border: 'none', position: 'absolute', inset: 0 }}
          showNavigator={false}
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          onLoad={onLoad}
        />
      </div>
    </SandpackProvider>
  );
}

// ── PreviewHeader ─────────────────────────────────────────────────────────
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
    <div className="min-h-12 sm:h-11 flex flex-wrap sm:flex-nowrap items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-0 shrink-0 border-b border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex items-center gap-2.5">
        <Play className="h-3.5 w-3.5 text-[var(--app-accent)]" />
        <h3 className="text-[13px] font-semibold tracking-tight uppercase text-[var(--app-text)]">Preview</h3>
        {hasError && (
          <span className="inline-flex text-[9px] h-4 px-1.5 uppercase font-black rounded-[6px] bg-[var(--app-danger-soft)] text-[var(--app-danger)]">Error</span>
        )}
        <span className={cn(
          'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider',
          useDocker ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : dockerReady ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
        )}>
          {useDocker ? (<><Container className="h-2.5 w-2.5" /> Docker</>) : (<><Zap className="h-2.5 w-2.5" /> Instant</>)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 ml-0 sm:ml-2">
        <button onClick={() => setDeviceMode('desktop')} className={cn('h-10 w-10 sm:h-7 sm:w-7 rounded-[5px] flex items-center justify-center transition-colors touch-manipulation', deviceMode === 'desktop' ? 'bg-[var(--app-surface)] text-[var(--app-text)]' : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]')} title="Desktop"><Monitor className="h-4 w-4 sm:h-3.5 sm:w-3.5" /></button>
        <button onClick={() => setDeviceMode('tablet')} className={cn('h-10 w-10 sm:h-7 sm:w-7 rounded-[5px] flex items-center justify-center transition-colors touch-manipulation', deviceMode === 'tablet' ? 'bg-[var(--app-surface)] text-[var(--app-text)]' : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]')} title="Tablet"><Tablet className="h-4 w-4 sm:h-3.5 sm:w-3.5" /></button>
        <button onClick={() => setDeviceMode('mobile')} className={cn('h-10 w-10 sm:h-7 sm:w-7 rounded-[5px] flex items-center justify-center transition-colors touch-manipulation', deviceMode === 'mobile' ? 'bg-[var(--app-surface)] text-[var(--app-text)]' : 'text-[var(--app-text-dim)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]')} title="Mobile"><Smartphone className="h-4 w-4 sm:h-3.5 sm:w-3.5" /></button>
      </div>

      {dockerReady && !useDocker && (
        <button onClick={onToggleEngine} className="ml-2 h-6 px-2 rounded-[4px] border border-emerald-500/20 bg-emerald-500/5 text-[9px] font-semibold text-emerald-400 hover:bg-emerald-500/10 transition-colors flex items-center gap-1 touch-manipulation" title="Upgrade to Docker preview">
          <Container className="h-2.5 w-2.5" /> Docker
        </button>
      )}
      {useDocker && (
        <button onClick={onToggleEngine} className="ml-2 h-6 px-2 rounded-[4px] border border-blue-500/20 bg-blue-500/5 text-[9px] font-semibold text-blue-400 hover:bg-blue-500/10 transition-colors flex items-center gap-1 touch-manipulation" title="Switch to instant preview">
          <Zap className="h-2.5 w-2.5" /> Instant
        </button>
      )}

      <div className="flex-1" />
      <div className="flex items-center gap-1.5">
        <button onClick={onRefresh} className="h-10 w-10 sm:h-7 sm:w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors touch-manipulation" title="Refresh preview"><RefreshCw className="h-4 w-4 sm:h-3.5 sm:w-3.5" /></button>
        <button onClick={() => setIsFullscreen(!isFullscreen)} className="h-10 w-10 sm:h-7 sm:w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors touch-manipulation" title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── PreviewStatusBar ──────────────────────────────────────────────────────
function PreviewStatusBar({ deviceMode, engine, sandpackLoaded }: { deviceMode: DeviceMode; engine: string; sandpackLoaded?: boolean }) {
  return (
    <div className="h-6 border-t border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Engine: <span className="font-semibold text-[var(--app-accent)]/75">{engine}</span></span>
        <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Mode: <span className="font-semibold text-[var(--app-accent)]/75">{deviceMode}</span></span>
      </div>
      <div className="flex items-center gap-3">
        {sandpackLoaded && (<div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /><span className="text-[9px] text-emerald-400/70 uppercase tracking-widest">Live</span></div>)}
      </div>
    </div>
  );
}
