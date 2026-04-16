/**
 * Loading Skeleton Components - Enhanced
 *
 * Skeleton loading states with shimmer animations for better UX.
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function PageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 bg-muted/50 rounded-lg w-64 animate-shimmer" />
        <div className="h-4 bg-muted/50 rounded w-96 animate-shimmer" style={{ animationDelay: '0.1s' }} />
        <div className="space-y-3 mt-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 bg-muted/50 rounded-lg animate-shimmer"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card className="animate-scale-in">
      <CardHeader>
        <div className="h-6 bg-muted/50 rounded w-3/4 mb-2 animate-shimmer" />
        <div className="h-4 bg-muted/50 rounded w-1/2 animate-shimmer" style={{ animationDelay: '0.1s' }} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 bg-muted/50 rounded animate-shimmer" style={{ animationDelay: '0.15s' }} />
          <div className="h-4 bg-muted/50 rounded w-5/6 animate-shimmer" style={{ animationDelay: '0.2s' }} />
          <div className="h-4 bg-muted/50 rounded w-4/6 animate-shimmer" style={{ animationDelay: '0.25s' }} />
        </div>
      </CardContent>
    </Card>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-muted/50 rounded-lg animate-shimmer"
          style={{ animationDelay: `${i * 0.05}s` }}
        />
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end animate-slide-up">
        <div className="h-12 bg-muted/50 rounded-lg rounded-tr-none max-w-xs animate-shimmer" />
      </div>
      <div className="flex justify-start animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="space-y-2">
          <div className="h-6 bg-muted/50 rounded-lg rounded-tl-none w-64 animate-shimmer" style={{ animationDelay: '0.15s' }} />
          <div className="h-6 bg-muted/50 rounded w-48 animate-shimmer" style={{ animationDelay: '0.2s' }} />
          <div className="h-6 bg-muted/50 rounded w-56 animate-shimmer" style={{ animationDelay: '0.25s' }} />
        </div>
      </div>
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-scale-in" style={{ animationDelay: `${i * 0.05}s` }}>
          <CardContent className="p-6">
            <div className="h-4 bg-muted/50 rounded w-24 mb-2 animate-shimmer" />
            <div className="h-8 bg-muted/50 rounded w-16 animate-shimmer" style={{ animationDelay: '0.1s' }} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-muted/50 rounded animate-shimmer"
          style={{
            width: `${[70, 85, 92, 78, 88, 75, 95, 80][i % 8]}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
