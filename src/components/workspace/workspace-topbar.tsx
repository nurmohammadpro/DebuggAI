'use client';

import Link from 'next/link';
import { Zap, Share2, Play } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import { ThemeToggle } from '@/components/theme-toggle';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { WorkspaceProjectSwitcher } from '@/components/workspace/workspace-project-switcher';
import { Logo } from '@/components/logo';
import { WorkspaceSaveVersionButton } from '@/components/workspace/workspace-save-version-button';

export function WorkspaceTopbar({
  projectId,
  branchName,
  unsavedCount,
  onRun,
  onShare,
}: {
  projectId: string | null;
  branchName: string;
  unsavedCount: number;
  onRun: () => void;
  onShare: () => void;
}) {
  const { user } = useSessionStore();

  return (
    <header className="h-11 flex items-center bg-[var(--app-panel)] border-b border-[var(--app-border)] sticky top-0 z-50">
      <Link
        href="/dashboard"
        className="h-full px-4 flex items-center gap-2 border-r border-[var(--app-border)] hover:bg-[var(--app-surface)] transition-colors"
      >
        <Logo className="h-5 w-auto" />
      </Link>

      <div className="px-3 flex items-center gap-2 min-w-0">
        <WorkspaceProjectSwitcher selectedProjectId={projectId} />
      </div>

      <div className="flex items-center gap-2 text-[13px] text-[var(--app-text-muted)] min-w-0">
        <Link
          href="/dashboard"
          className="text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors flex items-center gap-1"
        >
          Projects
        </Link>
        <span className="text-[var(--app-text-dim)]">/</span>
        <span className="ml-2 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)]">
          {branchName}
        </span>
        {unsavedCount > 0 && (
          <span className="text-[11px] px-2 py-0.5 rounded-[6px] bg-[var(--app-warning)]/10 border border-[var(--app-warning)]/20 text-[var(--app-warning)]">
            {unsavedCount} unsaved
          </span>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 pr-3">
        <ThemeToggle className="h-8 w-8" />

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)]">
          <Zap className="h-3.5 w-3.5" style={{ color: 'var(--app-accent)' }} />
          <span className="font-semibold text-[var(--app-text)]">
            {user?.credits === -1 ? '∞' : user?.credits ?? 0}
          </span>
          <span className="text-[var(--app-text-muted)]">credits</span>
        </div>

        <WorkspaceSaveVersionButton />

        <button
          className="h-8 px-3 rounded-[6px] border border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)] transition-colors inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tight text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
          onClick={onShare}
        >
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button
          className="h-8 px-3 rounded-[6px] bg-[var(--app-accent)] text-black hover:opacity-90 transition inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tight"
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
