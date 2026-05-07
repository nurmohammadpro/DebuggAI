import { cn } from '@/lib/utils';

export function PageSkeleton() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 bg-[var(--app-surface)] rounded-[8px] w-64 animate-shimmer" />
        <div className="h-4 bg-[var(--app-surface)] rounded-[8px] w-96 animate-shimmer" style={{ animationDelay: '0.1s' }} />
        <div className="space-y-3 mt-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-24 bg-[var(--app-surface)] rounded-[8px] animate-shimmer"
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
    <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl animate-scale-in">
      <div className="p-5">
        <div className="h-6 bg-[var(--app-surface)] rounded-[8px] w-3/4 mb-2 animate-shimmer" />
        <div className="h-4 bg-[var(--app-surface)] rounded-[8px] w-1/2 animate-shimmer" style={{ animationDelay: '0.1s' }} />
      </div>
      <div className="p-5 pt-0">
        <div className="space-y-2">
          <div className="h-4 bg-[var(--app-surface)] rounded-[8px] animate-shimmer" style={{ animationDelay: '0.15s' }} />
          <div className="h-4 bg-[var(--app-surface)] rounded-[8px] w-5/6 animate-shimmer" style={{ animationDelay: '0.2s' }} />
          <div className="h-4 bg-[var(--app-surface)] rounded-[8px] w-4/6 animate-shimmer" style={{ animationDelay: '0.25s' }} />
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 bg-[var(--app-surface)] rounded-[8px] animate-shimmer"
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
        <div className="h-12 bg-[var(--app-surface)] rounded-[10px] max-w-xs animate-shimmer" />
      </div>
      <div className="flex justify-start animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="space-y-2">
          <div className="h-6 bg-[var(--app-surface)] rounded-[6px] w-64 animate-shimmer" style={{ animationDelay: '0.15s' }} />
          <div className="h-6 bg-[var(--app-surface)] rounded-[8px] w-48 animate-shimmer" style={{ animationDelay: '0.2s' }} />
          <div className="h-6 bg-[var(--app-surface)] rounded-[8px] w-56 animate-shimmer" style={{ animationDelay: '0.25s' }} />
        </div>
      </div>
    </div>
  );
}

export function StatsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl p-5 animate-scale-in" style={{ animationDelay: `${i * 0.05}s` }}>
          <div className="h-4 bg-[var(--app-surface)] rounded-[8px] w-24 mb-2 animate-shimmer" />
          <div className="h-8 bg-[var(--app-surface)] rounded-[8px] w-16 animate-shimmer" style={{ animationDelay: '0.1s' }} />
        </div>
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
          className="h-4 bg-[var(--app-surface)] rounded-[8px] animate-shimmer"
          style={{
            width: `${[70, 85, 92, 78, 88, 75, 95, 80][i % 8]}%`,
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
