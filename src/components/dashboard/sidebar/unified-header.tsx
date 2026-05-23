'use client';

import Link from 'next/link';
import { HelpCircle } from 'lucide-react';
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
  titleBadge?: React.ReactNode;
  actions?: React.ReactNode;
  toolTabs?: ToolTab[];
  activeToolTab?: WorkspaceRightTab;
  onToolTabChange?: (tab: WorkspaceRightTab) => void;
  mobileMenuButton?: React.ReactNode;
  showHelp?: boolean;
  showAccountMenu?: boolean;
  toolTabsClassName?: string;
}

export function UnifiedHeader({
  title,
  subtitle,
  titleBadge,
  actions,
  toolTabs,
  activeToolTab,
  onToolTabChange,
  mobileMenuButton,
  showHelp = true,
  showAccountMenu = true,
  toolTabsClassName,
}: UnifiedHeaderProps) {
  return (
    <header className="h-12 border-b border-[var(--app-border)] flex items-center justify-between px-4 bg-[var(--app-panel)] shrink-0">
      {/* Left: Mobile Menu Button + Title + Tool Tabs */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mobile Menu Button */}
        {mobileMenuButton}

        {title && (
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-semibold text-[var(--app-text)] truncate">
                {title}
              </h1>
              {titleBadge}
            </div>
            {subtitle && (
              <p className="text-[11px] text-[var(--app-text-muted)] truncate">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Tool Tabs */}
        {toolTabs && toolTabs.length > 0 && (
          <div
            className={`flex-1 min-w-0 flex items-center gap-1 relative overflow-x-auto ${toolTabsClassName || ''}`}
          >
            {toolTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeToolTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onToolTabChange?.(tab.id)}
                  className={`shrink-0 h-8 flex items-center gap-1.5 px-2.5 rounded-[6px] text-[11px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)]'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
                  }`}
                >
                  <Icon className={`w-3 h-3 transition-transform duration-150 ${isActive ? 'scale-110' : ''}`} />
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
        {showHelp && (
          <Link
            href="/docs"
            className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all"
            aria-label="Help"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </Link>
        )}

        {/* User Account Menu */}
        {showAccountMenu && <AccountMenu align="end" className="h-7 w-7" />}
      </div>
    </header>
  );
}
