'use client';

export function DashboardStatsGrid() {
  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard value="12" label="Active Projects" />
      <StatCard value="3" label="Open Issues" />
      <StatCard value="847" label="Total Edits" />
      <StatCard value="2.4k" label="Credits Left" />
    </div>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-4 border border-[var(--border-default)] rounded-[var(--radius-md)] bg-[var(--bg-primary)]">
      <div className="text-[24px] font-semibold text-[var(--text-primary)] mb-1">
        {value}
      </div>
      <div className="text-[12px] text-[var(--text-secondary)]">
        {label}
      </div>
    </div>
  );
}
