'use client';

import { useSessionStore } from '@/store/session-store';
import { AccountMenu } from '@/components/account/account-menu';
import { useWorkspaceStore } from '@/store/workspace-store';
import { WorkspaceModeToggle } from '@/components/workspace/workspace-mode-toggle';

export function DashboardTopRight() {
  const { user } = useSessionStore();
  const { mode, setMode } = useWorkspaceStore();

  return (
    <div className="flex items-center gap-3">
      <div className="px-2.5 py-1 rounded-full border border-border/40 text-xs text-muted-foreground bg-card">
        <span className="font-medium text-foreground">
          {user?.credits === -1 ? '∞' : user?.credits ?? 0}
        </span>
        <span className="ml-1">credits</span>
      </div>
      <div className="hidden md:block">
        <WorkspaceModeToggle mode={mode} onModeChange={setMode} />
      </div>
      <AccountMenu />
    </div>
  );
}
