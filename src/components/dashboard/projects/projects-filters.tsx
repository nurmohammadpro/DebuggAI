'use client';

import { ReactSelect } from '@/components/ui/react-select';
import { WEB_BUILDER_STACKS } from '@/lib/constants';

export function ProjectsFilters({
  query,
  onQueryChange,
  stack,
  onStackChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  stack: string;
  onStackChange: (value: string) => void;
}) {
  return (
    <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl p-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[13px] font-medium text-[var(--app-text-muted)]">Search</label>
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by prompt or description..."
            className="w-full h-11 sm:h-8 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 sm:px-2.5 py-2 sm:py-1 text-[16px] sm:text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-[var(--app-text-muted)]">Stack</label>
          <ReactSelect
            size="sm"
            value={stack === 'all' ? { value: 'all', label: 'All stacks' } : (() => {
              const s = WEB_BUILDER_STACKS.find(x => x.id === stack);
              return s ? { value: s.id, label: s.name } : null;
            })()}
            onChange={(opt) => onStackChange(opt?.value || 'all')}
            options={[
              { value: 'all', label: 'All stacks' },
              ...WEB_BUILDER_STACKS.map((s) => ({ value: s.id, label: s.name })),
            ]}
            placeholder="All stacks"
          />
        </div>
      </div>
    </div>
  );
}
