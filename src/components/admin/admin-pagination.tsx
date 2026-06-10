'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        <Button
          variant="outline"
          size="icon"
          onClick={onPrev}
          disabled={page <= 1}
        >
          <ChevronLeft />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={onNext}
          disabled={page >= pages}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
