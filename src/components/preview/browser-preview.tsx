'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGenerationStore } from '@/store/generation-store';
import { csrfHeader } from '@/lib/csrf-client';
import type { RuntimeError } from '@/store/generation-store';
import { AlertCircle, Info, Play, RefreshCw } from 'lucide-react';

interface BrowserPreviewProps {
  height?: string;
  className?: string;
  chromeless?: boolean;
}

const PREVIEW_COMPILE_TIMEOUT_MS = 20_000;

/**
 * In-browser preview that compiles generated TSX/JSX on the server
 * and renders in a sandboxed iframe with error trapping.
 *
 * Replaces the Docker sandbox-based preview for UI rendering.
 */
export function BrowserPreview({ className, chromeless = false }: BrowserPreviewProps) {
  const { files, previewNonce, bumpPreviewNonce, setLastError, clearError, lastError } =
    useGenerationStore();

  const [html, setHtml] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'compiling' | 'ready' | 'error'>('idle');
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const previousSnapshot = useRef<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const htmlRef = useRef<string | null>(null);
  const compileRunRef = useRef(0);

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
          // Preview is loaded and trap is active
          break;
        case 'console.error':
        case 'console.warn':
          // Convert console errors to preview errors
          if (data.type === 'console.error') {
            setLastError({
              message: data.args?.join(' ') || 'Console error',
              source: 'console',
            });
          }
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
      }
    },
    [setLastError],
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [handleMessage]);

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
    const snapshot = JSON.stringify({ entryPath: files.entryPath, files: flatFiles });
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
          ...csrfHeader(),
        },
        body: JSON.stringify({
          files: flatFiles,
          entryPoint: files.entryPath,
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
  }, [files, clearError]);

  useEffect(() => {
    compile();
  }, [compile, previewNonce]);

  const handleRefresh = useCallback(() => {
    previousSnapshot.current = '';
    clearError();
    bumpPreviewNonce();
  }, [clearError, bumpPreviewNonce]);

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

      <div className="flex-1 min-h-0 bg-[#F0F0F0] dark:bg-[#1A1A1A] flex items-stretch justify-stretch p-0">
        <div className="bg-white flex-1 flex flex-col min-h-0 overflow-hidden">
          {status === 'idle' && <IdleState />}
          {status === 'compiling' && <CompilingState />}
          {status === 'error' && (
            <CompileErrorState
              errors={compileErrors}
              onRetry={handleRefresh}
            />
          )}
          {status === 'ready' && html && (
            <iframe
              ref={iframeRef}
              srcDoc={html}
              className="h-full w-full border-0"
              title="Preview"
              sandbox="allow-scripts allow-forms allow-modals"
            />
          )}
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

      <PreviewStatusBar engine="esbuild/React" />
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function BrowserHeader({
  status,
  onRefresh,
  hasErrors,
}: {
  status: string;
  onRefresh: () => void;
  hasErrors: boolean;
}) {
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
      <div className="flex items-center gap-1.5">
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
