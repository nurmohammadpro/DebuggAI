'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
            className="w-full h-9 rounded-[8px] border-0 bg-[var(--app-panel-2)] px-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[13px] font-medium text-[var(--app-text-muted)]">Stack</label>
          <Select value={stack} onValueChange={(v) => onStackChange(v || 'all')}>
            <SelectTrigger className="w-full rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel-2)] text-[13px]">
              <SelectValue placeholder="All stacks" />
            </SelectTrigger>
            <SelectContent className="rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel-2)]">
              <SelectItem value="all">All stacks</SelectItem>
              {WEB_BUILDER_STACKS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
