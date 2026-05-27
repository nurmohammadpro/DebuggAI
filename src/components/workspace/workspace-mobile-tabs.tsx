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
    <div className="sm:hidden bg-[var(--app-panel)] flex items-center justify-around px-1 py-1 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center justify-center gap-1 w-full min-h-[48px] transition-colors rounded-[10px] ${
              isActive
                ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface)]/60 hover:text-[var(--app-text)]'
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
