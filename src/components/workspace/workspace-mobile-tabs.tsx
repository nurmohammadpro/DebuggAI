'use client';

import { Code2, Eye, Files, Terminal } from 'lucide-react';
import type { WorkspaceRightTab } from './workspace-right-panel';

interface WorkspaceMobileTabsProps {
  activeTab: WorkspaceRightTab;
  onTabChange: (tab: WorkspaceRightTab) => void;
}

const tabs = [
  { id: 'code' as const, label: 'Code', icon: Code2 },
  { id: 'preview' as const, label: 'Preview', icon: Eye },
  { id: 'files' as const, label: 'Files', icon: Files },
  { id: 'console' as const, label: 'Console', icon: Terminal },
];

export function WorkspaceMobileTabs({ activeTab, onTabChange }: WorkspaceMobileTabsProps) {
  return (
    <div className="sm:hidden h-14 border-t border-[var(--app-border)] bg-[var(--app-panel)] flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
              isActive ? 'text-[var(--app-text)]' : 'text-[var(--app-text-muted)]'
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
