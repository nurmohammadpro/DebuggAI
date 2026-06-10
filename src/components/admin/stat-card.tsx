'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  loading?: boolean;
  className?: string;
}

function TrendBadge({ change }: { change: number }) {
  if (change === 0) {
    return (
      <Badge variant="gray">
        <Minus className="w-2.5 h-2.5" />
        Flat
      </Badge>
    );
  }
  const isUp = change > 0;
  return (
    <Badge variant={isUp ? 'green' : 'red'}>
      {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {isUp ? '+' : ''}{change}%
    </Badge>
  );
}

export function AdminStatCard({ title, value, change, icon, loading, className }: StatCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-5 w-14 rounded" />
          </div>
          <Skeleton className="mb-2 h-6 w-20" />
          <Skeleton className="h-3.5 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-200 text-gray-800">
            {icon}
          </div>
          {change !== undefined && <TrendBadge change={change} />}
        </div>
        <p className="text-xl font-medium text-[var(--text-primary)]">{value}</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">{title}</p>
      </CardContent>
    </Card>
  );
}
