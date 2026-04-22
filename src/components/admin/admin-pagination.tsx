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
    <div className="flex items-center justify-between gap-3 pt-4">
      <div className="text-xs text-muted-foreground">
        Page <span className="text-foreground">{page}</span> of{' '}
        <span className="text-foreground">{Math.max(1, pages)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={page >= pages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

