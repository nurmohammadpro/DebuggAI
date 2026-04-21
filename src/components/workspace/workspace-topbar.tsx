'use client';

import Link from 'next/link';
import { Zap, Share2, Play } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';

export function WorkspaceTopbar({
  projectName,
  branchName,
  unsavedCount,
}: {
  projectName: string;
  branchName: string;
  unsavedCount: number;
}) {
  const { user } = useSessionStore();

  return (
    <header className="h-11 flex items-center bg-card border-b border-border">
      <Link
        href="/dashboard"
        className="h-full px-4 flex items-center gap-2 border-r border-border hover:bg-muted/30 transition-colors"
      >
        <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-xs font-semibold text-primary">D</span>
        </div>
        <span className="text-[13.5px] font-semibold tracking-tight">
          DeBuggAI
        </span>
      </Link>

      <div className="px-3 flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        <Link
          href="/dashboard/home"
          className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          Projects
        </Link>
        <span className="text-muted-foreground/60">/</span>
        <span className="text-foreground font-medium truncate max-w-[220px]">
          {projectName}
        </span>
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
        <div className="hidden sm:flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-muted/40 border border-border">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold">
            {user?.credits === -1 ? '∞' : user?.credits ?? 0}
          </span>
          <span className="text-muted-foreground">credits</span>
        </div>

        <button className="h-8 px-3 rounded-full border border-border bg-transparent hover:bg-muted/40 transition-colors inline-flex items-center gap-2 text-xs">
          <Share2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Share</span>
        </button>

        <button className="h-8 px-3 rounded-full bg-primary text-primary-foreground hover:brightness-110 transition inline-flex items-center gap-2 text-xs font-semibold">
          <Play className="h-3.5 w-3.5" />
          <span>Run</span>
        </button>

        <div
          className="h-8 w-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-xs font-semibold text-primary"
          title="Account"
        >
          {user?.displayName?.charAt(0)?.toUpperCase() ||
            user?.email?.charAt(0)?.toUpperCase() ||
            'U'}
        </div>
      </div>
    </header>
  );
}

