'use client';

import Link from 'next/link';
import { LucideIcon, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const colorMap: Record<string, string> = {
  blue: 'bg-blue-200 text-blue-800',
  green: 'bg-green-200 text-green-800',
  purple: 'bg-purple-200 text-purple-800',
  orange: 'bg-orange-200 text-orange-800',
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
  const colorClass = colorMap[color] ?? colorMap.blue;

  return (
    <Link href={href} className="group block">
      <Card className="border border-[var(--border-default)] transition-colors hover:border-[var(--border-strong)]">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded shrink-0', colorClass)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-medium text-[var(--text-primary)]">{title}</h3>
              <p className="text-[10px] text-[var(--text-secondary)] truncate">{description}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-[var(--text-tertiary)] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
