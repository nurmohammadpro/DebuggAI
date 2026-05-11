'use client';

import { useMemo } from 'react';
import { ChevronRight, MessageSquare, Terminal, GitBranch, SlidersHorizontal, Plug } from 'lucide-react';
import { ChatPanel } from '@/components/web-builder/chat-panel';
import { ErrorConsole } from '@/components/web-builder/error-console';
import { WorkspaceGitPanel } from '@/components/workspace/workspace-git-panel';
import { WorkspaceEnvPanel } from '@/components/workspace/workspace-env-panel';
import { WorkspaceConnectionsPanel } from '@/components/workspace/workspace-connections-panel';

import type { WorkspaceRightTab } from './workspace-icon-sidebar';

export function WorkspaceRightPanel({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapsed,
  width,
}: {
  activeTab: WorkspaceRightTab;
  onTabChange: (tab: WorkspaceRightTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  width: number;
}) {
  const tabs = useMemo(
    () => [
      { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
      { id: 'console' as const, label: 'Console', icon: Terminal },
      { id: 'git' as const, label: 'Git', icon: GitBranch },
      { id: 'env' as const, label: 'Env', icon: SlidersHorizontal },
      { id: 'connections' as const, label: 'Connect', icon: Plug },
    ],
    []
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

  return (
    <aside
      className="bg-[var(--app-panel)] flex flex-col min-w-[320px]"
      style={{ width }}
    >
      <div className="h-11 border-b border-[var(--app-border)] flex items-center gap-1 px-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`h-8 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors inline-flex items-center gap-2 border ${
              activeTab === t.id
                ? 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text)]'
                : 'bg-transparent border-transparent text-[var(--app-text-muted)] hover:bg-[var(--app-surface)]/50 hover:border-[var(--app-border)]/50'
            }`}
            onClick={() => onTabChange(t.id)}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}

        <div className="flex-1" />

        <button
          className="h-8 w-8 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors"
          title="Collapse panel"
          onClick={onToggleCollapsed}
        >
          <ChevronRight className="h-4 w-4 rotate-180 text-[var(--app-text-dim)]" />
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
    </aside>
  );
}
