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
      <span className="inline-flex items-center gap-1 rounded-[6px] bg-[var(--app-surface)] px-2.5 py-1 text-[11px] font-normal text-[var(--app-text-muted)]">
        <Minus className="w-3 h-3" />
        Flat
      </span>
    );
  }
  const isUp = change > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[11px] font-normal ${
        isUp
          ? 'bg-[var(--app-success-soft)] text-[var(--app-success)]'
          : 'bg-[var(--app-danger-soft)] text-[var(--app-danger)]'
      }`}
    >
      {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {isUp ? '+' : ''}{change}%
    </span>
  );
}

export function AdminStatCard({ title, value, change, icon, loading, className }: StatCardProps) {
  if (loading) {
    return (
      <div className={`animate-pulse rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl ${className ?? ''}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-10 w-10 rounded-[7px] bg-[var(--app-surface)]" />
          <div className="h-6 w-16 rounded-[6px] bg-[var(--app-surface)]" />
        </div>
        <div className="mb-2 h-7 w-24 rounded bg-[var(--app-surface)]" />
        <div className="h-4 w-20 rounded bg-[var(--app-surface)]" />
      </div>
    );
  }

  return (
    <div
      className={`rounded-[8px] bg-[var(--app-panel)] p-5 backdrop-blur-xl transition-colors duration-200 hover:bg-[var(--app-panel-2)] ${className ?? ''}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
          {icon}
        </div>
        {change !== undefined && <TrendBadge change={change} />}
      </div>
      <p className="text-[22px] font-medium tracking-[-0.03em] text-[var(--app-text)]">{value}</p>
      <p className="mt-1 text-sm font-normal text-[var(--app-text-muted)]">{title}</p>
    </div>
  );
}
