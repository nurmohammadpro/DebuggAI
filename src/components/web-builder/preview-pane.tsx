/**
 * Preview Pane Component
 *
 * Iframe sandbox for live code preview.
 * Captures runtime errors via postMessage.
 */

'use client';

import { SandpackProvider, SandpackPreview } from '@codesandbox/sandpack-react';
import { useGenerationStore } from '@/store/generation-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      // Sandpack expects keys like "/App.tsx" (relative to project root)
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
    <Card 
      className={cn(
        "overflow-hidden flex flex-col border-white/[0.05] shadow-[0_8px_32px_rgba(0,0,0,0.2)] bg-black/10 backdrop-blur-xl", 
        !chromeless && "rounded-2xl border",
        className
      )} 
      style={{ height }}
    >
      {/* Header */}
      <div
        className={cn(
          "flex items-center justify-between border-b border-white/[0.05] bg-white/[0.02] backdrop-blur-md px-4 h-12 shrink-0",
          !chromeless && "rounded-t-2xl"
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Play className="h-3.5 w-3.5 text-emerald-400" />
            <div className="absolute inset-0 bg-emerald-400/20 blur-sm rounded-full animate-pulse" />
          </div>
          <h3 className="text-[13px] font-bold tracking-tight uppercase">Live Preview</h3>
          {lastError && (
            <Badge variant="red" className="text-[9px] h-4 px-1.5 uppercase font-black bg-rose-500 text-white border-0 shadow-lg shadow-rose-950/20">
              Runtime Error
            </Badge>
          )}
          {!isLoading && !lastError && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 animate-in fade-in duration-500">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-all"
            onClick={handleRefresh}
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-all"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
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
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-zinc-950 animate-in fade-in duration-500">
            <div className="relative mb-8">
              <div className="w-16 h-16 rounded-2xl border-2 border-emerald-500/20 animate-spin [animation-duration:3s]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Play className="h-6 w-6 text-emerald-500 animate-pulse" />
              </div>
              <div className="absolute -inset-4 bg-emerald-500/5 blur-2xl rounded-full" />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-[0.3em] animate-pulse">Initializing Sandbox</span>
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-emerald-500/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1 h-1 bg-emerald-500/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1 h-1 bg-emerald-500/20 rounded-full animate-bounce" />
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
      <div className="h-6 border-t border-white/[0.05] bg-white/[0.02] px-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">Engine:</span>
            <span className="text-[9px] font-bold text-emerald-400/60 uppercase">React v18</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">Port:</span>
            <span className="text-[9px] font-bold text-emerald-400/60 uppercase">3000</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest">Sandbox-V2-Isolated</span>
        </div>
      </div>

      {/* Error Display */}
      {lastError && (
        <div className="border-t border-rose-500/20 p-4 bg-rose-500/5 backdrop-blur-sm shrink-0">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider mb-1">Runtime Error</h4>
              <p className="text-sm text-foreground/90 font-mono leading-relaxed">{lastError.message}</p>
              {lastError.lineno && (
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  at line {lastError.lineno}{lastError.colno && `:${lastError.colno}`}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLastError(null)}
              className="h-6 text-[10px] uppercase font-bold text-rose-500 hover:bg-rose-500/10"
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
