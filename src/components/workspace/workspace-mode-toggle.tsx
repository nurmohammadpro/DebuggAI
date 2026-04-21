'use client';

import { Bug, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { WorkspaceMode } from '@/store/workspace-store';

export function WorkspaceModeToggle({
  mode,
  onModeChange,
}: {
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-full border border-border bg-muted/30 p-1">
      <Button
        type="button"
        size="sm"
        variant={mode === 'build' ? 'default' : 'ghost'}
        className="h-7 rounded-full text-xs"
        onClick={() => onModeChange('build')}
      >
        <Wand2 className="mr-2 h-3.5 w-3.5" />
        Build
      </Button>
      <Button
        type="button"
        size="sm"
        variant={mode === 'debug' ? 'default' : 'ghost'}
        className="h-7 rounded-full text-xs"
        onClick={() => onModeChange('debug')}
      >
        <Bug className="mr-2 h-3.5 w-3.5" />
        Debug
      </Button>
    </div>
  );
}

