'use client';

import { ChevronRight, X } from 'lucide-react';
import { ChatPanel } from '@/components/web-builder/chat-panel';
import { ErrorConsole } from '@/components/web-builder/error-console';
import { WorkspaceGitPanel } from '@/components/workspace/workspace-git-panel';
import { WorkspaceEnvPanel } from '@/components/workspace/workspace-env-panel';
import { WorkspaceConnectionsPanel } from '@/components/workspace/workspace-connections-panel';

export type WorkspaceRightTab =
  | 'chat'
  | 'console'
  | 'git'
  | 'env'
  | 'connections';

interface WorkspaceRightPanelProps {
  activeTab: WorkspaceRightTab;
  onTabChange: (tab: WorkspaceRightTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  width: number;
  mobile?: boolean;
  onMobileClose?: () => void;
}

export function WorkspaceRightPanel({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapsed,
  width,
  mobile = false,
  onMobileClose,
}: WorkspaceRightPanelProps) {
  const panelContent = (
    <>
      {/* Panel Header with Title and Close Button */}
      <div className="h-11 border-b border-[var(--app-border)] flex items-center justify-between px-3 shrink-0">
        <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text)]">
          {activeTab === 'chat' && 'Chat'}
          {activeTab === 'console' && 'Console'}
          {activeTab === 'git' && 'Git'}
          {activeTab === 'env' && 'Environment'}
          {activeTab === 'connections' && 'Connections'}
        </h2>
        <button
          className="h-8 w-8 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors"
          title={mobile ? 'Close' : 'Collapse panel'}
          onClick={mobile ? onMobileClose : onToggleCollapsed}
        >
          {mobile ? (
            <X className="h-4 w-4 text-[var(--app-text-dim)]" />
          ) : (
            <ChevronRight className="h-4 w-4 rotate-180 text-[var(--app-text-dim)]" />
          )}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="h-full">
            <ChatPanel
              height="100%"
              chromeless
              mode="build"
              className="h-full bg-transparent"
            />
          </div>
        )}

        {activeTab === 'console' && (
          <div className="h-full">
            <ErrorConsole chromeless className="h-full" />
          </div>
        )}

        {activeTab === 'git' && (
          <WorkspaceGitPanel />
        )}

        {activeTab === 'env' && (
          <WorkspaceEnvPanel />
        )}

        {activeTab === 'connections' && (
          <WorkspaceConnectionsPanel />
        )}
      </div>
    </>
  );

  if (collapsed) {
    return (
      <aside className="w-10 bg-[var(--app-panel)] flex items-center justify-center">
        <button
          className="h-8 w-8 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors"
          title="Expand panel"
          onClick={onToggleCollapsed}
        >
          <ChevronRight className="h-4 w-4 text-[var(--app-text-dim)]" />
        </button>
      </aside>
    );
  }

  if (mobile) {
    return (
      <aside className="fixed inset-0 top-14 bottom-14 bg-[var(--app-panel)] flex flex-col z-50 sm:hidden">
        {panelContent}
      </aside>
    );
  }

  return (
    <aside
      className="bg-[var(--app-panel)] flex flex-col min-w-[320px]"
      style={{ width }}
    >
      {panelContent}
    </aside>
  );
}
