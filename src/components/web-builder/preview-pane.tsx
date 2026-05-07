'use client';

import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import { useGenerationStore } from '@/store/generation-store';
import { RefreshCw, Play, Maximize2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

interface PreviewPaneProps {
  height?: string;
  className?: string;
  chromeless?: boolean;
  sandboxUrl?: string | null;
}

export function PreviewPane({
  height = '600px',
  className,
  chromeless = false,
  sandboxUrl,
}: PreviewPaneProps) {
  const {
    files,
    currentCode,
    lastError,
    setLastError
  } = useGenerationStore();
  const { resolvedTheme } = useTheme();
  const [nonce, setNonce] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const sandpackFiles = useMemo(() => {
    if (!files) return undefined;
    const result: Record<string, { code: string }> = {};
    for (const [path, file] of Object.entries(files.files)) {
      if (file.status === 'deleted') continue;
      const key = path.startsWith('/') ? path : '/' + path;
      result[key] = { code: file.content };
    }
    return result;
  }, [files, currentCode]);

  const handleRefresh = () => {
    setIsLoading(true);
    setNonce(n => n + 1);
    setLastError(null);
  };

  return (
    <div
      className={cn(
        "overflow-hidden flex flex-col border border-[var(--app-border)] bg-[var(--app-panel)] rounded-[10px]",
        className
      )}
      style={{ height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-panel-2)] px-4 h-12 shrink-0">
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
      {sandboxUrl ? (
        <div className="flex-1 min-h-0 relative bg-white">
          <iframe
            src={sandboxUrl}
            className="w-full h-full border-0"
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            onLoad={() => setIsLoading(false)}
          />
        </div>
      ) : (
        <>
      {/* Sandpack content (in-browser fallback) */}
      <div className="flex-1 min-h-0 bg-white relative">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[var(--app-bg)] animate-in fade-in duration-500">
            <div className="relative mb-8">
              <div className="w-16 h-16 rounded-[10px] border-2 border-[var(--app-accent)]/20 animate-spin [animation-duration:3s]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="h-6 w-6 text-[var(--app-accent)] animate-pulse" />
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-semibold text-[var(--app-accent)] uppercase tracking-[0.3em] animate-pulse">Initializing Sandbox</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-[var(--app-accent)]/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1 h-1 bg-[var(--app-accent)]/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1 h-1 bg-[var(--app-accent)]/20 rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}

        <SandpackProvider
          key={nonce}
          template="react"
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
          files={sandpackFiles}
          options={{
            recompileMode: 'delayed',
            recompileDelay: 500,
          }}
        >
          <SandpackPreview
            style={{ height: '100%', border: 'none' }}
            showNavigator={false}
            showOpenInCodeSandbox={false}
            onLoad={() => setIsLoading(false)}
          />
        </SandpackProvider>
      </div>
        </>
      )}

      {/* Status Bar */}
      <div className="h-6 border-t border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Engine:</span>
            <span className="text-[9px] font-semibold text-[var(--app-accent)]/60 uppercase">React v18</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-tighter">Port:</span>
            <span className="text-[9px] font-semibold text-[var(--app-accent)]/60 uppercase">3000</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-medium text-[var(--app-text-dim)] uppercase tracking-widest">Sandbox-V2-Isolated</span>
        </div>
      </div>

      {/* Error Display */}
      {lastError && (
        <div className="border-t border-[var(--app-danger)]/20 p-4 bg-[var(--app-danger-soft)] shrink-0">
          <div className="flex items-start gap-3">
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
