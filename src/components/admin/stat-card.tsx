'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

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
      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-gray-500">
        <Minus className="w-2.5 h-2.5" />
        Flat
      </span>
    );
  }
  const isUp = change > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium ${
        isUp
          ? 'bg-green-200 text-green-800'
          : 'bg-red-200 text-red-800'
      }`}
    >
      {isUp ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
      {isUp ? '+' : ''}{change}%
    </span>
  );
}

export function AdminStatCard({ title, value, change, icon, loading, className }: StatCardProps) {
  if (loading) {
    return (
      <div className={`animate-pulse bg-[var(--bg-tertiary)] p-4 ${className ?? ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="h-8 w-8 rounded bg-[var(--bg-secondary)]" />
          <div className="h-5 w-14 rounded bg-[var(--bg-secondary)]" />
        </div>
        <div className="mb-2 h-6 w-20 rounded bg-[var(--bg-secondary)]" />
        <div className="h-3.5 w-16 rounded bg-[var(--bg-secondary)]" />
      </div>
    );
  }

  return (
    <div
      className={`bg-[var(--bg-tertiary)] p-4 ${className ?? ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-200 text-gray-800">
          {icon}
        </div>
        {change !== undefined && <TrendBadge change={change} />}
      </div>
      <p className="text-xl font-medium text-[var(--text-primary)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">{title}</p>
    </div>
  );
}
