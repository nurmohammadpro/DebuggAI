'use client';

import { useMemo } from 'react';
import { ChevronRight, MessageSquare, Terminal, GitBranch, Plug, SlidersHorizontal } from 'lucide-react';
import { ChatPanel } from '@/components/web-builder/chat-panel';
import { ErrorConsole } from '@/components/web-builder/error-console';
import { WorkspacePanelPlaceholder } from '@/components/workspace/workspace-panel-placeholder';
import type { WorkspaceMode } from '@/store/workspace-store';

import type { WorkspaceRightTab } from './workspace-icon-sidebar';

export function WorkspaceRightPanel({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapsed,
  width,
  mode,
}: {
  activeTab: WorkspaceRightTab;
  onTabChange: (tab: WorkspaceRightTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  width: number;
  mode: WorkspaceMode;
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
      <aside className="w-10 bg-card flex items-center justify-center">
        <button
          className="h-8 w-8 rounded-md hover:bg-muted/40 flex items-center justify-center"
          title="Expand panel"
          onClick={onToggleCollapsed}
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </aside>
    );
  }

  return (
    <aside
      className="bg-card flex flex-col min-w-[320px]"
      style={{ width }}
    >
      <div className="h-11 border-b border-border/40 flex items-center gap-1 px-2 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`h-8 px-3 rounded-full text-xs border transition-colors inline-flex items-center gap-2 ${
              activeTab === t.id
                ? 'bg-muted/50 border-border text-foreground'
                : 'bg-transparent border-transparent text-muted-foreground hover:bg-muted/30 hover:border-border'
            }`}
            onClick={() => onTabChange(t.id)}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}

        <div className="flex-1" />

        <button
          className="h-8 w-8 rounded-md hover:bg-muted/40 flex items-center justify-center"
          title="Collapse panel"
          onClick={onToggleCollapsed}
        >
          <ChevronRight className="h-4 w-4 rotate-180 text-muted-foreground" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="h-full">
            <ChatPanel
              height="100%"
              chromeless
              mode={mode}
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
          <WorkspacePanelPlaceholder title="Source Control" description="Git changes panel (mock UI)." />
        )}

        {activeTab === 'env' && (
          <WorkspacePanelPlaceholder title="Environment" description="Environment variables panel (mock UI)." />
        )}

        {activeTab === 'connections' && (
          <WorkspacePanelPlaceholder title="Connections" description="Integrations / connections panel (mock UI)." />
        )}
      </div>
    </aside>
  );
}
