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
    <header className="min-h-16 sm:min-h-14 flex items-center justify-between px-3 sm:px-4 bg-[var(--app-panel)] border-b border-[var(--app-border)] shrink-0">
      {/* Left: Mobile Menu Button + Title + Tool Tabs */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mobile Menu Button */}
        {mobileMenuButton && (
          <div className="md:hidden">
            {mobileMenuButton}
          </div>
        )}

        {title && (
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <h1 className="text-sm font-bold text-[var(--app-text)] truncate">
                {title}
              </h1>
              {titleBadge}
            </div>
            {subtitle && (
              <p className="text-[12px] text-[var(--app-text-muted)] truncate">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Tool Tabs */}
        {toolTabs && toolTabs.length > 0 && (
          <div
            className={`flex-1 min-w-0 flex items-center gap-1.5 relative overflow-x-auto ${toolTabsClassName || ''}`}
          >
            {toolTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeToolTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onToolTabChange?.(tab.id)}
                  className={`shrink-0 h-9 flex items-center gap-2 px-3 rounded-[6px] text-[12px] font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--ds-green-muted)] text-[var(--ds-green)] border border-[var(--ds-green)]/20'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]'
                  }`}
                >
                  <Icon className={`w-4 h-4 transition-transform duration-150 ${isActive ? 'scale-110' : ''}`} />
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
            className="touch-target-sm sm:h-9 sm:w-9 flex items-center justify-center rounded-[6px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] active:scale-[0.96] transition-all duration-150"
            aria-label="Help"
            title="Documentation"
          >
            <HelpCircle className="w-4 h-4" />
          </Link>
        )}

        {/* User Account Menu */}
        {showAccountMenu && <AccountMenu align="end" className="h-11 w-11 sm:h-9 sm:w-9" />}
      </div>
    </header>
  );
}
