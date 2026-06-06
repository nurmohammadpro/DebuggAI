'use client';

import { Loader2 } from 'lucide-react';

export function AdminLoading() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--app-accent)]" />
        <p className="text-sm text-[var(--app-text-muted)]">Loading...</p>
      </div>
    </div>
  );
}
