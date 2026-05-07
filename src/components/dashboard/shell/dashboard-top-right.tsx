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
      <div className="text-[13px] text-[var(--app-text-muted)]">
        <span className="text-[var(--app-text)] font-medium">
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
