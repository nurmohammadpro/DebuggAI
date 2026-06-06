'use client';

import { useGenerationStore } from '@/store/generation-store';
import { AlertTriangle, X, Bug, Loader2 } from 'lucide-react';
import { useDebugStore } from '@/store/debug-store';
import { useState } from 'react';
import { toast } from 'sonner';
import { useGeneration } from '@/hooks/use-generation';

interface ErrorConsoleProps {
  className?: string;
  chromeless?: boolean;
}

export function ErrorConsole({ className }: ErrorConsoleProps) {
  const { lastError, setLastError, currentCode } = useGenerationStore();
  const { isDebugging } = useDebugStore();
  const [debugging, setDebugging] = useState(false);

  const { debug } = useGeneration({
    onDone: () => {
      setDebugging(false);
      toast.success('Code debugged successfully!');
    },
    onError: (error) => {
      setDebugging(false);
      toast.error('Failed to debug code');
      console.log(error)
    },
  });

  const handleDebug = async () => {
    if (!lastError || !currentCode) return;

    setDebugging(true);
    try {
      await debug(currentCode, lastError.message);
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  const handleClear = () => {
    setLastError(null);
  };

  if (!lastError) {
    return (
      <div className={`rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] ${className || ''}`}>
        <div className="p-6 text-center">
          <Bug className="h-8 w-8 mx-auto mb-2 text-[var(--app-text-dim)]" />
          <p className="text-[13px] text-[var(--app-text-muted)]">No errors detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-[6px] bg-[var(--app-panel)] border border-[var(--app-border)] ${className || ''}`}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--app-danger)]" />
            <h3 className="text-[13px] font-medium text-[var(--app-text)]">Runtime Error</h3>
            <span className="inline-flex rounded-[6px] bg-[var(--app-danger-soft)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-danger)]">
              Error
            </span>
          </div>
          <button
            onClick={handleClear}
            className="h-8 w-8 rounded-[6px] flex items-center justify-center text-[var(--app-text-dim)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Message */}
        <div className="bg-[var(--app-danger-soft)] rounded-[6px] p-3 border border-[var(--app-danger)]/20">
          <p className="text-[13px] text-[var(--app-danger)] font-medium">
            {lastError.message}
          </p>
          {(lastError.lineno || lastError.source) && (
            <div className="mt-2 text-xs text-[var(--app-text-muted)] space-y-1">
              {lastError.source && (
                <p>
                  <span className="font-medium">Source:</span> {lastError.source}
                </p>
              )}
              {lastError.lineno && (
                <p>
                  <span className="font-medium">Line:</span> {lastError.lineno}
                  {lastError.colno && `, Column: ${lastError.colno}`}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleDebug}
            disabled={debugging || isDebugging}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-[6px] bg-[var(--app-accent)] px-4 py-2 text-[13px] font-medium text-[#071006] transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {debugging || isDebugging ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Debugging...
              </>
            ) : (
              <>
                <Bug className="h-4 w-4" />
                Debug This
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            disabled={debugging || isDebugging}
            className="inline-flex items-center gap-2 rounded-[6px] border border-[var(--app-border)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] disabled:opacity-50"
          >
            Clear
          </button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-[var(--app-text-muted)]">
          <p>
            Click <strong>Debug This</strong> to automatically fix this error using AI.
            The error and your code will be analyzed, and a corrected version will be generated.
          </p>
        </div>
      </div>
    </div>
  );
}
