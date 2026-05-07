'use client';

import type { LucideIcon } from 'lucide-react';

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}) {
  return (
    <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl p-8 text-center">
      <Icon className="h-10 w-10 mx-auto mb-3 text-[var(--app-text-dim)]" />
      <div className="text-[16px] font-medium text-[var(--app-text)]">{title}</div>
      <div className="text-[13px] text-[var(--app-text-muted)] mt-1 mb-4">{description}</div>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center rounded-[8px] bg-[var(--app-accent)] px-4 py-2 text-[13px] font-medium text-black transition-colors hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
