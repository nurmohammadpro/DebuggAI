'use client';

import { useCallback, useRef } from 'react';

export function WorkspaceSplitter({
  ariaLabel,
  onResize,
}: {
  ariaLabel: string;
  onResize: (deltaX: number) => void;
}) {
  const startXRef = useRef<number | null>(null);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (startXRef.current === null) return;
      const deltaX = e.clientX - startXRef.current;
      startXRef.current = e.clientX;
      onResize(deltaX);
    },
    [onResize]
  );

  const endDrag = useCallback(() => {
    startXRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', endDrag);
    window.removeEventListener('pointercancel', endDrag);
  }, [onPointerMove]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
      startXRef.current = e.clientX;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    },
    [endDrag, onPointerMove]
  );

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation="vertical"
      tabIndex={0}
      onPointerDown={onPointerDown}
      className="group relative w-2 shrink-0 cursor-col-resize transition-colors duration-150 hover:bg-[var(--app-accent)]/5 active:bg-[var(--app-accent)]/10"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--app-border)] transition-colors duration-150 group-hover:bg-[var(--app-accent)]/30 group-active:bg-[var(--app-accent)]/50" />
      <div className="absolute top-1/2 left-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-[8px] bg-[var(--app-accent)]/0 transition-all duration-200 group-hover:bg-[var(--app-accent)]/20 group-active:bg-[var(--app-accent)]/30 group-hover:scale-y-110" />
      <div className="absolute top-1/2 left-1/2 h-8 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--app-accent)]/0 transition-all duration-200 group-hover:bg-[var(--app-accent)]/40 group-active:bg-[var(--app-accent)]/60 group-hover:h-10" />
    </div>
  );
}
