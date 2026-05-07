'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

export function AdminPagination({
  page,
  pages,
  onPrev,
  onNext,
}: {
  page: number;
  pages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-4 px-1">
      <span className="text-xs text-[var(--app-text-muted)]">
        Page <span className="text-[var(--app-text)]">{page}</span> of{' '}
        <span className="text-[var(--app-text)]">{Math.max(1, pages)}</span>
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onPrev}
          disabled={page <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onNext}
          disabled={page >= pages}
          className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
