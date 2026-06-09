'use client';

import { Code2, Eye } from 'lucide-react';
import type { V0RightView } from './v0-right-panel';

interface WorkspaceMobileTabsProps {
  activeTab: V0RightView;
  onTabChange: (tab: V0RightView) => void;
}

const tabs = [
  { id: 'preview' as const, label: 'Preview', icon: Eye },
  { id: 'code' as const, label: 'Code', icon: Code2 },
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
