'use client';

export function AdminPageHeader({
  title,
  description,
  right,
  badge,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
      <div className="flex items-center gap-3">
        <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
          {title}
        </h1>
        {badge}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {right}
      </div>
      {description && (
        <p className="w-full text-[13px] font-normal text-[var(--app-text-muted)] mt-0">
          {description}
        </p>
      )}
    </div>
  );
}
