/**
 * Error Console Component
 *
 * Displays runtime errors from iframe with "Debug this" button.
 * Integrates with the debug endpoint to fix errors.
 */

'use client';

import { useGenerationStore } from '@/store/generation-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, X, Bug, Loader2 } from 'lucide-react';
import { useDebugStore } from '@/store/debug-store';
import { useState } from 'react';
import { toast } from 'sonner';
import { useGeneration } from '@/hooks/use-generation';

interface ErrorConsoleProps {
  className?: string;
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
    },
  });

  const handleDebug = async () => {
    if (!lastError || !currentCode) return;

    setDebugging(true);
    try {
      await debug(currentCode, lastError.message);
    } catch (error) {
      // Error handled in callbacks
      console.error('Debug error:', error);
    }
  };

  const handleClear = () => {
    setLastError(null);
  };

  if (!lastError) {
    return (
      <Card className={className}>
        <div className="p-6 text-center text-muted-foreground">
          <Bug className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No errors detected</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h3 className="font-medium">Runtime Error</h3>
            <Badge variant="destructive">Error</Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Error Message */}
        <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/20">
          <p className="text-sm text-destructive font-medium">
            {lastError.message}
          </p>
          {(lastError.lineno || lastError.source) && (
            <div className="mt-2 text-xs text-muted-foreground space-y-1">
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
          <Button
            onClick={handleDebug}
            disabled={debugging || isDebugging}
            className="flex-1"
          >
            {debugging || isDebugging ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Debugging...
              </>
            ) : (
              <>
                <Bug className="mr-2 h-4 w-4" />
                Debug This
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            disabled={debugging || isDebugging}
          >
            Clear
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground">
          <p>
            Click <strong>Debug This</strong> to automatically fix this error using AI.
            The error and your code will be analyzed, and a corrected version will be generated.
          </p>
        </div>
      </div>
    </Card>
  );
}
