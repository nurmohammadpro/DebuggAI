import type { LucideIcon } from 'lucide-react';

export function DashboardPageHeader({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {Icon && <Icon className="h-4 w-4 text-[var(--app-accent)] shrink-0" />}
          <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">{title}</h1>
        </div>
        {description && (
          <p className="text-[13px] text-[var(--app-text-muted)] mt-1">{description}</p>
        )}
      </div>
      {children && <div className="shrink-0">{children}</div>}
    </div>
  );
}
