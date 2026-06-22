'use client';

import { useState, useMemo } from 'react';
import { useGenerationStore } from '@/store/generation-store';
import { cn } from '@/lib/utils';
import { ChevronRight, FileCode, Clock, GitBranch } from 'lucide-react';

export function DiffTimeline() {
  const { turnSnapshots, getTurnDiffs } = useGenerationStore();
  const [expandedTurn, setExpandedTurn] = useState<string | null>(null);
  const [diffFile, setDiffFile] = useState<{ path: string; oldContent: string; newContent: string } | null>(null);

  const turnsWithDiffs = useMemo(() => {
    return turnSnapshots
      .map((snap) => ({ ...snap, diffs: getTurnDiffs(snap.turnId) }))
      .filter((t) => t.diffs.length > 0)
      .reverse();
  }, [turnSnapshots, getTurnDiffs]);

  if (!turnsWithDiffs.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <GitBranch className="h-8 w-8 text-[var(--app-text-dim)] mb-3 opacity-30" />
        <p className="text-[11px] text-[var(--app-text-dim)]">No changes recorded yet.</p>
        <p className="text-[10px] text-[var(--app-text-muted)] mt-1">
          File diffs will appear here after each agent turn.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {diffFile ? (
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--app-border)] bg-[var(--app-panel)] shrink-0">
            <button
              onClick={() => setDiffFile(null)}
              className="text-[11px] font-medium text-[var(--app-accent)] hover:underline"
            >
              &larr; Back to timeline
            </button>
            <span className="text-[10px] text-[var(--app-text-dim)] font-mono truncate">{diffFile.path}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <DiffView oldContent={diffFile.oldContent} newContent={diffFile.newContent} />
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden">
          {turnsWithDiffs.map((turn) => {
            const isExpanded = expandedTurn === turn.turnId;
            const added = turn.diffs.filter((d) => !d.oldContent).length;
            const modified = turn.diffs.filter((d) => d.oldContent && d.newContent).length;
            const deleted = turn.diffs.filter((d) => d.oldContent && !d.newContent).length;

            return (
              <div key={turn.turnId} className="border-b border-[var(--app-border)] last:border-b-0">
                <button
                  onClick={() => setExpandedTurn(isExpanded ? null : turn.turnId)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-[var(--app-surface)] transition-colors"
                >
                  <ChevronRight className={cn('h-3 w-3 text-[var(--app-text-dim)] shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                  <Clock className="h-3 w-3 text-[var(--app-text-dim)] shrink-0" />
                  <span className="text-[11px] font-medium text-[var(--app-text)]">
                    {new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    {added > 0 && <span className="text-[9px] font-semibold text-emerald-500">+{added}</span>}
                    {modified > 0 && <span className="text-[9px] font-semibold text-amber-500">~{modified}</span>}
                    {deleted > 0 && <span className="text-[9px] font-semibold text-rose-500">-{deleted}</span>}
                    <span className="text-[9px] text-[var(--app-text-dim)] ml-1">{turn.diffs.length} file{turn.diffs.length !== 1 ? 's' : ''}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-[var(--app-border)]">
                    {turn.diffs.map((diff) => (
                      <button
                        key={diff.path}
                        onClick={() => setDiffFile(diff)}
                        className="w-full flex items-center gap-2 px-6 py-1.5 text-left hover:bg-[var(--app-surface)] transition-colors"
                      >
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          !diff.oldContent ? 'bg-emerald-400' : !diff.newContent ? 'bg-rose-400' : 'bg-amber-400',
                        )} />
                        <FileCode className="h-3 w-3 text-[var(--app-text-dim)] shrink-0" />
                        <span className="text-[10px] font-mono text-[var(--app-text)] truncate">{diff.path}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DiffView({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  const maxLines = Math.max(oldLines.length, newLines.length);

  return (
    <div className="text-[11px] font-mono leading-relaxed">
      <div className="sticky top-0 bg-[var(--app-panel-2)] border-b border-[var(--app-border)] px-3 py-1 flex items-center gap-3 text-[9px] uppercase font-semibold text-[var(--app-text-dim)]">
        <span className="text-rose-400">Before</span>
        <span className="flex-1" />
        <span className="text-emerald-400">After</span>
      </div>
      {Array.from({ length: maxLines }).map((_, i) => {
        const oldLine = oldLines[i] ?? '';
        const newLine = newLines[i] ?? '';
        const isChanged = oldLine !== newLine;
        return (
          <div key={i} className={cn('flex border-b border-[var(--app-border)]/30 min-h-[22px]', isChanged && 'bg-amber-400/5')}>
            <div className={cn('w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all border-r border-[var(--app-border)]/30', isChanged && !oldLine && 'bg-rose-400/10', isChanged && oldLine && 'bg-rose-400/5')}>
              <span className="text-[var(--app-text-dim)] select-none mr-2">{i + 1}</span>
              <span className={cn(isChanged ? 'text-rose-300' : 'text-[var(--app-text-muted)]')}>{oldLine || ' '}</span>
            </div>
            <div className={cn('w-1/2 px-3 py-0.5 whitespace-pre-wrap break-all', isChanged && !newLine && 'bg-rose-400/10', isChanged && newLine && 'bg-emerald-400/5')}>
              <span className="text-[var(--app-text-dim)] select-none mr-2">{i + 1}</span>
              <span className={cn(isChanged ? 'text-emerald-300' : 'text-[var(--app-text-muted)]')}>{newLine || ' '}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
