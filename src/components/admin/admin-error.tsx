'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function AdminError({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="p-6">
      <div className="text-sm font-semibold">{title}</div>
      {message ? (
        <div className="text-xs text-muted-foreground mt-1">{message}</div>
      ) : null}
      {onRetry ? (
        <div className="mt-4">
          <Button variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

