'use client';

import Link from 'next/link';
import { Settings, HelpCircle } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import { AccountMenu } from '@/components/account/account-menu';

import type { WorkspaceRightTab } from '@/components/workspace/workspace-right-panel';

export type ToolTab = {
  id: WorkspaceRightTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

interface UnifiedHeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  toolTabs?: ToolTab[];
  activeToolTab?: WorkspaceRightTab;
  onToolTabChange?: (tab: WorkspaceRightTab) => void;
  mobileMenuButton?: React.ReactNode;
}

export function UnifiedHeader({ title, subtitle, actions, toolTabs, activeToolTab, onToolTabChange, mobileMenuButton }: UnifiedHeaderProps) {
  const { user } = useSessionStore();

  return (
    <header className="h-14 border-b border-[var(--border-default)] flex items-center justify-between px-4 bg-[var(--bg-secondary)] shrink-0">
      {/* Left: Mobile Menu Button + Title + Tool Tabs */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mobile Menu Button */}
        {mobileMenuButton}

        {title && (
          <div className="min-w-0">
            <h1 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-[12px] text-[var(--text-secondary)] truncate">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Tool Tabs */}
        {toolTabs && toolTabs.length > 0 && (
          <div className="flex items-center gap-1">
            {toolTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onToolTabChange?.(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-[12px] font-medium transition-all ${
                    activeToolTab === tab.id
                      ? 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {actions}

        {/* Help */}
        <Link
          href="/docs"
          className="w-7 h-7 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
          aria-label="Help"
        >
          <HelpCircle className="w-4 h-4" />
        </Link>

        {/* User Account Menu */}
        <AccountMenu align="end" className="h-8 w-8" />
      </div>
    </header>
  );
}
