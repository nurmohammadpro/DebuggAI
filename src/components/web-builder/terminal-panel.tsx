/**
 * Terminal Panel Component
 *
 * Displays live build/dev server logs from the sandbox.
 * Auto-scrolls to bottom on new output.
 */

'use client';

import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TerminalPanelProps {
  logs: string[];
  isBuilding: boolean;
  error?: string | null;
  className?: string;
}

export function TerminalPanel({
  logs,
  isBuilding,
  error,
  className,
}: TerminalPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className={cn(
        'bg-black/90 text-green-400/90 font-mono text-xs rounded-xl overflow-hidden border border-white/[0.05] flex flex-col',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-8 bg-black/60 border-b border-white/[0.05] shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-rose-500/60" />
            <div className="w-2 h-2 rounded-full bg-amber-500/60" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider font-bold ml-2">
            Terminal
          </span>
        </div>
        {isBuilding && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-emerald-500/70 uppercase tracking-widest font-bold">
              Building
            </span>
          </div>
        )}
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 leading-relaxed whitespace-pre-wrap break-all"
        style={{ scrollBehavior: 'smooth' }}
      >
        {logs.length === 0 && !error && (
          <span className="text-muted-foreground/30 italic">
            Waiting for build output...
          </span>
        )}

        {logs.map((line, i) => (
          <div key={i} className="hover:bg-white/[0.02]">
            <span className="text-muted-foreground/20 select-none mr-2">
              {String(i + 1).padStart(3, ' ')}
            </span>
            <span
              className={
                line.includes('error') || line.includes('Error')
                  ? 'text-rose-400'
                  : line.includes('warn') || line.includes('WARN')
                    ? 'text-amber-400'
                    : ''
              }
            >
              {line}
            </span>
          </div>
        ))}

        {error && (
          <div className="text-rose-400 font-bold mt-2">
            ⚠ {error}
          </div>
        )}

        {isBuilding && (
          <span className="inline-block w-2 h-4 bg-emerald-500/70 ml-1 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
