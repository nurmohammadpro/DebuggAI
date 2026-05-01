'use client';

import { useSessionStore } from '@/store/session-store';

export function V0HomeTopRight() {
  const { user } = useSessionStore();

  return (
    <div className="flex items-center gap-3">
      <div className="px-2.5 py-1 rounded-full border border-border/40 text-xs text-muted-foreground bg-card">
        <span className="font-medium text-foreground">5.00</span>
      </div>
      <div
        className="h-8 w-8 rounded-full bg-muted/40 border border-border/40"
        title={user?.email || 'Account'}
      />
    </div>
  );
}

