'use client';

import { MessageSquare, Terminal, GitBranch, Settings, Plug } from 'lucide-react';
import type { WorkspaceRightTab } from './workspace-right-panel';

interface WorkspaceMobileTabsProps {
  activeTab: WorkspaceRightTab;
  onTabChange: (tab: WorkspaceRightTab) => void;
}

const tabs = [
  { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
  { id: 'console' as const, label: 'Console', icon: Terminal },
  { id: 'git' as const, label: 'Git', icon: GitBranch },
  { id: 'env' as const, label: 'Env', icon: Settings },
  { id: 'connections' as const, label: 'Connect', icon: Plug },
];

export function WorkspaceMobileTabs({ activeTab, onTabChange }: WorkspaceMobileTabsProps) {
  return (
    <div className="sm:hidden h-14 border-t border-[var(--border-default)] bg-[var(--bg-secondary)] flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
