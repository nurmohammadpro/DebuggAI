'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Bug, ArrowRight, Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';

export function RecentDebugSessions() {
  const { data, isLoading, error } = useMyDebugSessions(5, true);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-semibold">Recent Debug Sessions</div>
        <Link href="/dashboard/debug/history">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
            View all
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}

      {error && (
        <div className="text-xs text-muted-foreground">
          Failed to load sessions.
        </div>
      )}

      {!isLoading && !error && (!data || data.length === 0) && (
        <div className="text-xs text-muted-foreground">
          No sessions yet.
        </div>
      )}

      {!isLoading && !error && data && data.length > 0 && (
        <div className="space-y-2">
          {data.map((s) => (
            <div
              key={s.id}
              className="flex items-start gap-2 rounded-md border border-border/40 p-2 hover:bg-muted/20 transition-colors"
            >
              <Bug className="h-4 w-4 mt-0.5 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                    {s.language}
                  </Badge>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="text-xs mt-1 text-muted-foreground line-clamp-2">
                  {s.error_message || s.code}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

