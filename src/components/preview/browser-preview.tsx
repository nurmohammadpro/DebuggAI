'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGenerationStore } from '@/store/generation-store';

import { AlertCircle, Info, Monitor, Smartphone, Tablet, Play, RefreshCw, Maximize2, Minimize2, Crosshair } from 'lucide-react';

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

interface BrowserPreviewProps {
  height?: string;
  className?: string;
  chromeless?: boolean;
  sandboxUrl?: string | null;
  sandboxStatus?: 'idle' | 'creating' | 'installing' | 'running' | 'error' | 'stopped';
}

const PREVIEW_COMPILE_TIMEOUT_MS = 20_000;

function entryPointToPreviewPath(entryPoint: string): string {
  const normalized = String(entryPoint || '').replace(/\\/g, '/').replace(/^(\.\/)+/, '');
  const appMatch = normalized.match(/^(?:src\/)?app\/(.+)\/page\.[a-zA-Z0-9]+$/);
  if (appMatch) return segmentsToRoutePath(appMatch[1] || '');
  if (/^(?:src\/)?app\/page\.[a-zA-Z0-9]+$/.test(normalized)) return '/';
  const pagesMatch = normalized.match(/^(?:src\/)?pages\/(.+)\.[a-zA-Z0-9]+$/);
  if (pagesMatch) {
    const route = pagesMatch[1] || '';
    if (route === 'index') return '/';
    return segmentsToRoutePath(route.replace(/\/index$/, ''));
  }
  return '/';
}

function segmentsToRoutePath(route: string): string {
  const segments = String(route || '')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => !/^\(.*\)$/.test(segment) && !segment.startsWith('_'));
  if (segments.length === 0) return '/';
  return `/${segments.join('/')}`;
}

/**
 * Resolve an href to the corresponding Next.js App Router page file path.
 * e.g. "/about" → "app/about/page.tsx", "/" → "app/page.tsx"
 */
function resolvePageEntry(
  href: string,
  fileEntries: Record<string, { path: string; content: string; status?: string; language?: string }>,
): string | null {
  // Parse the pathname from the href (ignore protocol/host for relative URLs)
  let pathname = href;
  try {
    const u = new URL(href, 'http://localhost');
    pathname = u.pathname;
  } catch {}
  if (!pathname.startsWith('/')) pathname = '/' + pathname;

  // Normalize: strip trailing slash (except root)
  if (pathname !== '/') pathname = pathname.replace(/\/+$/, '');

  const fileKeys = Object.keys(fileEntries);

  // Build candidate paths (ordered by priority)
  const candidates: string[] = [];

  // 1. Exact match: /about → app/about/page.tsx
  const segment = pathname === '/' ? '' : pathname;
  for (const ext of ['tsx', 'ts', 'jsx', 'js']) {
    candidates.push(`app${segment}/page.${ext}`);
    candidates.push(`src/app${segment}/page.${ext}`);
  }

  // 2. Dynamic routes: /blog/post-1 → app/blog/[slug]/page.tsx
  //    Split the path into segments and look for [param] patterns
  const pathSegments = pathname.split('/').filter(Boolean);
  for (const key of fileKeys) {
    const match = matchDynamicRoute(key, pathSegments);
    if (match) candidates.push(key);
  }

  // 3. Nested layouts: check if any layout file exists for this path
  for (const ext of ['tsx', 'ts', 'jsx', 'js']) {
    // Walk up from the deepest segment
    for (let i = pathSegments.length; i >= 0; i--) {
      const prefix = pathSegments.slice(0, i).join('/');
      const dir = prefix ? `app/${prefix}` : 'app';
      candidates.push(`${dir}/page.${ext}`);
      candidates.push(`src/${dir}/page.${ext}`);
    }
  }

  for (const c of candidates) {
    if (fileEntries[c]) return c;
  }

  return null;
}

/** Match a dynamic route pattern like app/blog/[slug]/page.tsx against segments */
function matchDynamicRoute(pattern: string, segments: string[]): boolean {
  // Only match app/.../page.{ext} patterns
  const pageMatch = pattern.match(/^(?:src\/)?app\/(.*)\/page\.(tsx|ts|jsx|js)$/);
  if (!pageMatch) return false;
  const routeParts = (pageMatch[1] || '').split('/');
  if (routeParts.length !== segments.length) return false;
  for (let i = 0; i < routeParts.length; i++) {
    const part = routeParts[i]!;
    if (part.startsWith('[') && part.endsWith(']')) continue; // dynamic segment
    if (part.startsWith('[...') && part.endsWith(']')) return true; // catch-all matches anything
    if (part !== segments[i]) return false;
  }
  return true;
}

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

/**
 * In-browser preview that compiles generated TSX/JSX on the server
 * and renders in a sandboxed iframe with error trapping.
 *
 * Replaces the Docker sandbox-based preview for UI rendering.
 */
export function BrowserPreview({ className, chromeless = false, sandboxUrl, sandboxStatus }: BrowserPreviewProps) {
  const { files, previewNonce, bumpPreviewNonce, setLastError, clearError, lastError, currentProjectId } =
    useGenerationStore();

  const [html, setHtml] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'compiling' | 'ready' | 'error'>('idle');
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inspectMode, setInspectMode] = useState(false);
  const [currentRouteHref, setCurrentRouteHref] = useState<string | null>(null);
  const [inspectedElement, setInspectedElement] = useState<{
    tag: string; id: string | null; classes: string; text: string; path: string; attributes: string;
  } | null>(null);
  const [inspectEditText, setInspectEditText] = useState('');
  const { setPendingInspectPrompt } = useGenerationStore();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previousSnapshot = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const htmlRef = useRef<string | null>(null);
  const compileRunRef = useRef(0);
  const consoleBufRef = useRef<Array<{ type: string; args: string[]; timestamp: number }>>([]);
  const networkBufRef = useRef<Array<{ url: string; method: string; status: number; statusText: string; error?: string; timestamp: number }>>([]);

  useEffect(() => {
    htmlRef.current = html;
  }, [html]);

  // Listen for postMessage from iframe (error trap)
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== 'debuggai-preview') return;

      switch (data.type) {
        case 'ready':
          break;
        case 'console.log':
        case 'console.info':
        case 'console.debug':
          consoleBufRef.current.push({
            type: data.type.replace('console.', ''),
            args: data.args || [],
            timestamp: data.timestamp || Date.now(),
          });
          break;
        case 'console.error':
        case 'console.warn':
          consoleBufRef.current.push({
            type: data.type.replace('console.', ''),
            args: data.args || [],
            timestamp: data.timestamp || Date.now(),
          });
          if (data.type === 'console.error') {
            setLastError({
              message: data.args?.join(' ') || 'Console error',
              source: 'console',
            });
          }
          break;
        case 'navigate':
          // SPA routing: find matching page file and recompile with it as entry point
          if (data.href && files) {
            const targetHref = String(data.href);
            const resolved = resolvePageEntry(targetHref, files.files);
            if (resolved) {
              setCurrentRouteHref(targetHref);
              const store = useGenerationStore.getState();
              if (resolved !== files.entryPath || targetHref !== currentRouteHref) {
                files.entryPath = resolved;
                store.bumpPreviewNonce();
              }
            }
          }
          break;
        case 'network-error':
          networkBufRef.current.push({
            url: data.url || '',
            method: data.method || 'GET',
            status: data.status || 0,
            statusText: data.statusText || '',
            error: data.error || '',
            timestamp: data.timestamp || Date.now(),
          });
          break;
        case 'runtime-error':
          setLastError({
            message: data.message,
            source: data.source,
            lineno: data.lineno,
            colno: data.colno,
          });
          break;
        case 'unhandled-rejection':
          setLastError({
            message: data.message,
            source: 'unhandled-rejection',
          });
          break;
        case 'element-clicked':
          if (data.element) {
            setInspectedElement(data.element);
            setInspectEditText('');
          }
          break;
        case 'inspect-mode-changed':
          if (data.active === false) setInspectMode(false);
          break;
      }
    },
    [currentRouteHref, setLastError, files],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

  // Flush console/network logs to the server-side buffer so the agent
  // can read them via read_dev_logs and read_network_requests.
  useEffect(() => {
    const flushInterval = setInterval(() => {
      const consoleEntries = consoleBufRef.current.splice(0);
      const networkEntries = networkBufRef.current.splice(0);
      if (!consoleEntries.length && !networkEntries.length) return;
      if (!currentProjectId) return;

      fetch('/api/preview/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: currentProjectId, console: consoleEntries, network: networkEntries }),
      }).catch(() => { /* best-effort, don't spam console */ });
    }, 5_000);

    return () => clearInterval(flushInterval);
  }, [currentProjectId]);

  // Compile and render whenever files or nonce changes
  const compile = useCallback(async () => {
    if (!files || Object.keys(files.files).length === 0) {
      compileRunRef.current += 1;
      abortRef.current?.abort();
      setHtml(null);
      setStatus('idle');
      setCompileErrors([]);
      return;
    }

    // Build flat file record
    const flatFiles: Record<string, string> = {};
    for (const [path, file] of Object.entries(files.files)) {
      if (file.status === 'deleted') continue;
      flatFiles[path] = file.content;
    }

    const totalChars = Object.values(flatFiles).reduce((sum, c) => sum + c.length, 0);
    if (totalChars < 20) {
      compileRunRef.current += 1;
      abortRef.current?.abort();
      setHtml(null);
      setStatus('idle');
      setCompileErrors([]);
      return;
    }

    // Snapshot check to avoid re-compiling identical code
    const routePath = currentRouteHref || entryPointToPreviewPath(files.entryPath);
    const snapshot = JSON.stringify({ entryPath: files.entryPath, routePath, files: flatFiles });
    if (snapshot === previousSnapshot.current && htmlRef.current) {
      setStatus('ready');
      setCompileErrors([]);
      return;
    }
    previousSnapshot.current = snapshot;

    const runId = compileRunRef.current + 1;
    compileRunRef.current = runId;

    setStatus('compiling');
    clearError();
    setCompileErrors([]);

    // Abort any in-flight compilation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, PREVIEW_COMPILE_TIMEOUT_MS);
    const isCurrentRun = () => compileRunRef.current === runId && abortRef.current === controller;

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          
        },
        body: JSON.stringify({
          files: flatFiles,
          entryPoint: files.entryPath,
          routePath,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Compilation failed' }));
        if (!isCurrentRun()) return;
        setCompileErrors(err.errors || [err.error || 'Unknown error']);
        setStatus('error');
        return;
      }

      const data = await res.json();
      if (!isCurrentRun()) return;

      if (data.html) {
        setHtml(data.html);
        setStatus('ready');
        // Clear previous errors on successful compilation
        clearError();
      } else {
        setCompileErrors(data.errors || ['No HTML returned']);
        setStatus('error');
      }
    } catch (err: unknown) {
      if (!isCurrentRun()) return;
      if ((err as Error)?.name === 'AbortError' && !timedOut) return;
      if (timedOut) {
        setCompileErrors([
          `Preview compile timed out after ${PREVIEW_COMPILE_TIMEOUT_MS / 1000}s. Try Refresh, or fix the generated code if it is still invalid.`,
        ]);
        setStatus('error');
        return;
      }
      setCompileErrors([err instanceof Error ? err.message : 'Compilation failed']);
      setStatus('error');
    } finally {
      window.clearTimeout(timeoutId);
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, [currentRouteHref, files, clearError]);

  useEffect(() => {
    previousSnapshot.current = '';
    compile();
  }, [compile, previewNonce]);

  useEffect(() => {
    setCurrentRouteHref(null);
  }, [currentProjectId]);

  const handleRefresh = useCallback(() => {
    previousSnapshot.current = '';
    clearError();
    bumpPreviewNonce();
  }, [clearError, bumpPreviewNonce]);

  // Sync inspect mode to iframe
  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: 'debuggai-parent', type: 'inspect-mode', active: inspectMode },
      '*',
    );
  }, [inspectMode]);

  // Send inspect prompt to agent
  const handleSendInspectPrompt = useCallback(() => {
    if (!inspectedElement || !inspectEditText.trim()) return;
    const prompt = `Edit the <${inspectedElement.tag}> element${inspectedElement.id ? ` with id="${inspectedElement.id}"` : ''}${inspectedElement.classes ? ` with classes "${inspectedElement.classes}"` : ''} at path \`${inspectedElement.path}\`. Current text: "${inspectedElement.text}". ${inspectEditText.trim()}`;
    setPendingInspectPrompt(prompt);
    setInspectedElement(null);
    setInspectEditText('');
    setInspectMode(false);
  }, [inspectedElement, inspectEditText, setPendingInspectPrompt]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      compileRunRef.current += 1;
      abortRef.current?.abort();
    };
  }, []);

  return (
    <div className={`flex flex-col bg-[var(--app-panel)] flex-1 min-h-0 ${className || ''}`}>
      {!chromeless && (
        <BrowserHeader
          status={status}
          onRefresh={handleRefresh}
          hasErrors={!!lastError || compileErrors.length > 0}
          device={device}
          onDeviceChange={setDevice}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          inspectMode={inspectMode}
          onToggleInspect={() => { setInspectMode(!inspectMode); setInspectedElement(null); }}
        />
      )}

      {!chromeless && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--app-accent)]/5 border-b border-[var(--app-border)] shrink-0">
          <Info className="h-3 w-3 text-[var(--app-accent)] shrink-0" />
          <span className="text-[10px] text-[var(--app-text-muted)] leading-tight">
            In-browser preview — compiles and renders TSX/JSX instantly
          </span>
        </div>
      )}

      <div className={`flex-1 min-h-0 bg-[#F0F0F0] dark:bg-[#1A1A1A] flex items-center justify-center p-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-[#F0F0F0] dark:bg-[#1A1A1A]' : ''}`}>
        <div className="bg-white flex flex-col min-h-0 overflow-hidden rounded-lg shadow-sm border border-[var(--app-border)] transition-all duration-200" style={{ width: DEVICE_WIDTHS[device], height: isFullscreen ? '100%' : '100%' }}>
          {status === 'idle' && <IdleState />}
          {status === 'compiling' && <CompilingState />}
          {status === 'error' && (
            <CompileErrorState
              errors={compileErrors}
              onRetry={handleRefresh}
            />
          )}
          {sandboxStatus === 'running' && sandboxUrl ? (
            <iframe
              ref={iframeRef}
              src={sandboxUrl}
              className="h-full w-full border-0"
              title="Live Preview"
            />
          ) : sandboxStatus === 'installing' || sandboxStatus === 'creating' ? (
            <SandboxStartingState />
          ) : status === 'ready' && html ? (
            <iframe
              ref={iframeRef}
              srcDoc={html}
              className="h-full w-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            />
          ) : null}
        </div>
      </div>

      {compileErrors.length > 0 && (
        <div className="border-t border-[var(--app-danger)]/25 p-3 bg-[var(--app-danger-soft)] shrink-0">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-[var(--app-danger)] shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-[var(--app-danger)] uppercase tracking-wider mb-1">
                Compilation Error
              </p>
              {compileErrors.map((err, i) => (
                <p key={i} className="text-[12px] text-[var(--app-text)] font-mono leading-relaxed break-words">
                  {err}
                </p>
              ))}
            </div>
            <button
              onClick={() => setCompileErrors([])}
              className="text-[10px] uppercase font-semibold text-[var(--app-danger)] hover:opacity-75 transition-opacity px-2 py-1 rounded shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

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
              {lastError.source && (
                <p className="text-[10px] text-[var(--app-text-dim)] mt-1">
                  at {lastError.source}{lastError.lineno ? `:${lastError.lineno}` : ''}
                </p>
              )}
            </div>
            <button
              onClick={() => clearError()}
              className="text-[10px] uppercase font-semibold text-[var(--app-danger)] hover:opacity-75 transition-opacity px-2 py-1 rounded shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Inspect element prompt bar */}
      {inspectedElement && (
        <div className="border-t border-blue-500/30 p-3 bg-blue-500/5 shrink-0 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-start gap-2">
            <Crosshair className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider mb-1">
                Element Selected
              </p>
              <p className="text-[11px] text-[var(--app-text)] font-mono mb-1">
                &lt;{inspectedElement.tag}{inspectedElement.id ? ` #${inspectedElement.id}` : ''}{inspectedElement.classes ? ` .${inspectedElement.classes.split(/\s+/).slice(0, 3).join('.')}` : ''}&gt;
              </p>
              {inspectedElement.text && (
                <p className="text-[10px] text-[var(--app-text-dim)] truncate">&quot;{inspectedElement.text.slice(0, 100)}&quot;</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={inspectEditText}
                  onChange={(e) => setInspectEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendInspectPrompt(); if (e.key === 'Escape') { setInspectedElement(null); setInspectEditText(''); } }}
                  placeholder="What should the AI change? e.g. 'make this button blue'"
                  className="flex-1 h-8 px-2.5 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[11px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] focus:outline-none focus:border-blue-400"
                  autoFocus
                />
                <button
                  onClick={handleSendInspectPrompt}
                  disabled={!inspectEditText.trim()}
                  className="h-8 px-3 rounded-[6px] bg-blue-500 text-white text-[11px] font-semibold uppercase hover:bg-blue-600 disabled:opacity-40 transition-opacity shrink-0"
                >
                  Ask AI
                </button>
                <button
                  onClick={() => { setInspectedElement(null); setInspectEditText(''); }}
                  className="h-8 px-2 rounded-[6px] text-[var(--app-text-dim)] hover:text-[var(--app-text)] text-[11px] transition-colors shrink-0"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <PreviewStatusBar engine={sandboxStatus === 'running' ? 'Docker/Next.js' : 'esbuild/React'} />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function BrowserHeader({
  status,
  onRefresh,
  hasErrors,
  device,
  onDeviceChange,
  isFullscreen,
  onToggleFullscreen,
  inspectMode,
  onToggleInspect,
}: {
  status: string;
  onRefresh: () => void;
  hasErrors: boolean;
  device: DeviceMode;
  onDeviceChange: (d: DeviceMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  inspectMode?: boolean;
  onToggleInspect?: () => void;
}) {
  const devices: { mode: DeviceMode; icon: typeof Monitor; label: string }[] = [
    { mode: 'desktop', icon: Monitor, label: 'Desktop' },
    { mode: 'tablet', icon: Tablet, label: 'Tablet' },
    { mode: 'mobile', icon: Smartphone, label: 'Mobile' },
  ];

  return (
    <div className="h-11 flex items-center gap-1.5 px-3 shrink-0 border-b border-[var(--app-border)] bg-[var(--app-panel)]">
      <div className="flex items-center gap-2.5">
        <Play className="h-3.5 w-3.5 text-[var(--app-accent)]" />
        <h3 className="text-[13px] font-semibold tracking-tight uppercase text-[var(--app-text)]">
          Live Preview
        </h3>
        {status === 'compiling' && (
          <span className="inline-flex text-[9px] h-4 px-1.5 uppercase font-black rounded-[6px] bg-[var(--app-accent)]/10 text-[var(--app-accent)] animate-pulse">
            Compiling
          </span>
        )}
        {hasErrors && (
          <span className="inline-flex text-[9px] h-4 px-1.5 uppercase font-black rounded-[6px] bg-[var(--app-danger-soft)] text-[var(--app-danger)]">
            Error
          </span>
        )}
      </div>
      <div className="flex-1" />
      <div className="flex items-center gap-1">
        {devices.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            onClick={() => onDeviceChange(mode)}
            className={`h-7 w-7 rounded-[6px] flex items-center justify-center transition-colors ${
              device === mode
                ? 'bg-[var(--app-accent)]/15 text-[var(--app-accent)]'
                : 'text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]'
            }`}
            title={`${label} view`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <div className="w-px h-4 bg-[var(--app-border)] mx-0.5" />
        {onToggleInspect && (
          <button
            onClick={onToggleInspect}
            className={`h-7 w-7 rounded-[6px] flex items-center justify-center transition-colors ${
              inspectMode
                ? 'bg-blue-500/15 text-blue-400'
                : 'text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]'
            }`}
            title={inspectMode ? 'Exit inspect mode' : 'Inspect element — click an element to ask AI to edit it'}
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={onToggleFullscreen}
          className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onRefresh}
          className="h-7 w-7 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          title="Refresh preview"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function IdleState() {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--app-bg)]">
      <Play className="h-8 w-8 text-[var(--app-text-dim)] mb-3 opacity-30" />
      <p className="text-[11px] text-[var(--app-text-dim)]">
        Generate some code to see a preview
      </p>
    </div>
  );
}

function CompilingState() {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--app-bg)]">
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-[6px] border-2 border-[var(--app-accent)]/25 animate-spin [animation-duration:3s]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Play className="h-6 w-6 text-[var(--app-accent)] animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] font-semibold text-[var(--app-accent)] uppercase tracking-[0.3em] animate-pulse">
          Compiling Preview
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1 h-1 bg-[var(--app-accent)]/40 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}

function SandboxStartingState() {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--app-bg)]">
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-[10px] border-2 border-emerald-400/25 animate-spin [animation-duration:4s]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-lg">🐳</div>
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-[0.3em] animate-pulse">
          Starting Dev Server
        </span>
        <span className="text-[10px] text-[var(--app-text-dim)]">
          Installing dependencies and building…
        </span>
      </div>
    </div>
  );
}

function CompileErrorState({
  errors,
  onRetry,
}: {
  errors: string[];
  onRetry?: () => void;
}) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center bg-[var(--app-bg)] p-6 text-center">
      <AlertCircle className="h-6 w-6 text-[var(--app-danger)] mb-3" />
      <div className="text-[12px] font-semibold text-[var(--app-danger)] mb-2">
        Compilation Failed
      </div>
      {errors.map((err, i) => (
        <div key={i} className="text-[11px] text-[var(--app-text-dim)] max-w-[520px] mb-4 break-words font-mono">
          {err}
        </div>
      ))}
      {onRetry && (
        <button
          className="h-8 px-3 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] text-[11px] font-semibold uppercase tracking-tight hover:bg-[var(--app-panel-2)]"
          onClick={onRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

function PreviewStatusBar({ engine }: { engine: string }) {
  return (
    <div className="h-6 border-t border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Engine:</span>
          <span className="text-[9px] font-semibold text-[var(--app-accent)]/75 uppercase">{engine}</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-widest">
          Browser Preview
        </span>
      </div>
    </div>
  );
}
