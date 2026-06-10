import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function PageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-4 animate-fade-in">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <div className="space-y-3 mt-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl animate-scale-in">
      <div className="p-5">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <div className="p-5 pt-0">
        <div className="space-y-2">
          <Skeleton className="h-4" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16" />
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-end animate-slide-up">
        <Skeleton className="h-12 max-w-xs rounded-[10px]" />
      </div>
      <div className="flex justify-start animate-slide-up">
        <div className="space-y-2">
          <Skeleton className="h-6 w-64 rounded-[6px]" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-6 w-56" />
        </div>
      </div>
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl p-5 animate-scale-in">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TextSkeleton({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: `${[70, 85, 92, 78, 88, 75, 95, 80][i % 8]}%` }}
        />
      ))}
    </div>
  );
}
