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
        'bg-[#0C0F0C] text-[var(--app-accent)]/90 font-mono text-xs rounded-[10px] border border-[var(--app-border)] flex flex-col',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-8 bg-[var(--app-panel-2)] border-b border-[var(--app-border)] shrink-0 rounded-t-[10px]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[var(--app-danger)]/60" />
            <div className="w-2 h-2 rounded-full bg-[var(--app-warning)]/60" />
            <div className="w-2 h-2 rounded-full bg-[var(--app-success)]/60" />
          </div>
          <span className="text-[10px] text-[var(--app-text-dim)] uppercase tracking-wider font-semibold ml-2">
            Terminal
          </span>
        </div>
        {isBuilding && (
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] animate-pulse" />
            <span className="text-[9px] text-[var(--app-accent)]/70 uppercase tracking-widest font-semibold">
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
          <span className="text-[var(--app-text-dim)] italic">
            Waiting for build output...
          </span>
        )}

        {logs.map((line, i) => (
          <div key={i} className="hover:bg-[var(--app-accent-soft)]/30">
            <span className="text-[var(--app-text-dim)] select-none mr-2">
              {String(i + 1).padStart(3, ' ')}
            </span>
            <span
              className={
                line.includes('error') || line.includes('Error')
                  ? 'text-[var(--app-danger)]'
                  : line.includes('warn') || line.includes('WARN')
                    ? 'text-[var(--app-warning)]'
                    : ''
              }
            >
              {line}
            </span>
          </div>
        ))}

        {error && (
          <div className="text-[var(--app-danger)] font-semibold mt-2">
            {'>'} {error}
          </div>
        )}

        {isBuilding && (
          <span className="inline-block w-2 h-4 bg-[var(--app-accent)]/70 ml-1 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}
