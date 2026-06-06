'use client';

export function PlanBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-normal text-[var(--app-text)]">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-[var(--app-text)]">{count}</span>
          <span className="text-xs text-[var(--app-text-dim)]">
            {percentage.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[var(--app-surface)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.max(2, percentage)}%` }}
        />
      </div>
    </div>
  );
}
