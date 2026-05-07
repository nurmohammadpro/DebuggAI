'use client';

import Link from 'next/link';
import { LucideIcon, ArrowRight } from 'lucide-react';

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-[var(--app-info-soft)]', text: 'text-[var(--app-info)]' },
  green: { bg: 'bg-[var(--app-success-soft)]', text: 'text-[var(--app-success)]' },
  purple: { bg: 'bg-[var(--app-purple-soft)]', text: 'text-[var(--app-purple)]' },
  orange: { bg: 'bg-[var(--app-warning-soft)]', text: 'text-[var(--app-warning)]' },
};

export function AdminQuickCard({
  href,
  icon: Icon,
  title,
  description,
  color = 'blue',
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const c = colorMap[color] ?? colorMap.blue;

  return (
    <Link
      href={href}
      className="group rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl transition-colors duration-200 hover:bg-[var(--app-panel-2)]"
    >
      <div className="flex items-center gap-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-[8px] ${c.bg} ${c.text} transition-transform duration-200 group-hover:scale-105`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-normal text-[var(--app-text)]">{title}</h3>
          <p className="text-xs text-[var(--app-text-muted)] truncate">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-[var(--app-text-dim)] transition-all duration-200 group-hover:text-[var(--app-text)] group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
