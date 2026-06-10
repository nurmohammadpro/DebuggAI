'use client';

import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function DashboardStatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  color: 'red' | 'blue' | 'green' | 'amber' | 'purple';
}) {
  const colorVarMap: Record<string, string> = {
    red: 'var(--app-danger)',
    blue: 'var(--app-info)',
    green: 'var(--app-success)',
    amber: 'var(--app-warning)',
    purple: 'var(--app-purple)',
  };

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="text-[13px] text-[var(--app-text-muted)]">{title}</div>
          <Icon className="h-4 w-4 shrink-0" style={{ color: colorVarMap[color] }} />
        </div>
        <div className="text-lg font-medium leading-none mt-2" style={{ color: colorVarMap[color] }}>
          {value}
        </div>
        <p className="text-[13px] text-[var(--app-text-muted)] mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
