'use client';

import { useMemo } from 'react';
import { ChevronRight, MessageSquare, Eye, Terminal, GitBranch, Plug, SlidersHorizontal } from 'lucide-react';
import { ChatPanel } from '@/components/web-builder/chat-panel';
import { PreviewPane } from '@/components/web-builder/preview-pane';
import { ErrorConsole } from '@/components/web-builder/error-console';

import type { WorkspaceRightTab } from './workspace-icon-sidebar';

export function WorkspaceRightPanel({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapsed,
}: {
  activeTab: WorkspaceRightTab;
  onTabChange: (tab: WorkspaceRightTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const tabs = useMemo(
    () => [
      { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
      { id: 'preview' as const, label: 'Preview', icon: Eye },
      { id: 'console' as const, label: 'Console', icon: Terminal },
      { id: 'git' as const, label: 'Git', icon: GitBranch },
      { id: 'env' as const, label: 'Env', icon: SlidersHorizontal },
      { id: 'connections' as const, label: 'Connect', icon: Plug },
    ],
    []
  );

  if (collapsed) {
    return (
      <aside className="w-10 bg-card border-l border-border flex items-center justify-center">
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
    <aside className="w-[420px] max-w-[45vw] bg-card border-l border-border flex flex-col min-w-[320px]">
      <div className="h-11 border-b border-border flex items-center gap-1 px-2 overflow-x-auto">
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
            <ChatPanel height="100%" />
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="h-full p-2">
            <PreviewPane height="100%" />
          </div>
        )}

        {activeTab === 'console' && (
          <div className="h-full p-2">
            <ErrorConsole className="h-full" />
          </div>
        )}

        {activeTab === 'git' && (
          <Placeholder title="Source Control" description="Git changes panel (mock UI)." />
        )}

        {activeTab === 'env' && (
          <Placeholder title="Environment" description="Environment variables panel (mock UI)." />
        )}

        {activeTab === 'connections' && (
          <Placeholder title="Connections" description="Integrations / connections panel (mock UI)." />
        )}
      </div>
    </aside>
  );
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-6">
      <div className="text-sm font-semibold text-foreground mb-2">{title}</div>
      <div className="text-xs max-w-[260px] leading-relaxed">{description}</div>
    </div>
  );
}
