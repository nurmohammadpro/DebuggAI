'use client';

import Link from 'next/link';
import { Zap, Share2, Play } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import { ThemeToggle } from '@/components/theme-toggle';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { WorkspaceModeToggle } from '@/components/workspace/workspace-mode-toggle';
import type { WorkspaceMode } from '@/store/workspace-store';
import { WorkspaceProjectSwitcher } from '@/components/workspace/workspace-project-switcher';
import { Logo } from '@/components/logo';
import { WorkspaceSaveVersionButton } from '@/components/workspace/workspace-save-version-button';

export function WorkspaceTopbar({
  projectId,
  branchName,
  unsavedCount,
  mode,
  onModeChange,
  onRun,
  onShare,
}: {
  projectId: string | null;
  branchName: string;
  unsavedCount: number;
  mode: WorkspaceMode;
  onModeChange: (mode: WorkspaceMode) => void;
  onRun: () => void;
  onShare: () => void;
}) {
  const { user } = useSessionStore();

  return (
    <header className="h-11 flex items-center bg-card border-b border-border/40 sticky top-0 z-50">
      <Link
        href="/dashboard"
        className="h-full px-4 flex items-center gap-2 border-r border-border/40 hover:bg-muted/30 transition-colors"
      >
        <Logo className="h-5 w-auto" />
      </Link>

      <div className="px-3 flex items-center gap-2 min-w-0">
        <WorkspaceProjectSwitcher selectedProjectId={projectId} />
        <WorkspaceModeToggle mode={mode} onModeChange={onModeChange} />
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        <Link
          href="/dashboard/home"
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Projects
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="ml-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-muted/50 border border-border">
          {branchName}
        </span>
        {unsavedCount > 0 && (
          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
            {unsavedCount} unsaved
          </span>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 pr-3">
        <ThemeToggle className="h-8 w-8" />

        <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-muted/40 border border-border">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold">
            {user?.credits === -1 ? '∞' : user?.credits ?? 0}
          </span>
          <span className="text-muted-foreground">credits</span>
        </div>

        <WorkspaceSaveVersionButton />

        <button
          className="h-8 px-3 rounded-full border border-border/50 bg-transparent hover:bg-muted/40 transition-colors inline-flex items-center gap-2 text-xs"
          onClick={onShare}
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          className="h-8 px-3 rounded-full bg-primary text-primary-foreground hover:brightness-110 transition inline-flex items-center gap-2 text-xs font-semibold"
          onClick={onRun}
        >
          <Play className="h-3.5 w-3.5" />
          <span>Run</span>
        </button>

        <WorkspaceAccountMenu />
      </div>
    </header>
  );
}
