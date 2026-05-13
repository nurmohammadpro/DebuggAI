'use client';

import Link from 'next/link';
import { LucideIcon, ArrowRight } from 'lucide-react';

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-200', text: 'text-blue-800' },
  green: { bg: 'bg-green-200', text: 'text-green-800' },
  purple: { bg: 'bg-purple-200', text: 'text-purple-800' },
  orange: { bg: 'bg-orange-200', text: 'text-orange-800' },
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
      className="group border border-[var(--border-default)] p-3"
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded ${c.bg} ${c.text}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-[var(--text-primary)]">{title}</h3>
          <p className="text-[10px] text-[var(--text-secondary)] truncate">{description}</p>
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
      </div>
    </Link>
  );
}
