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
      className="relative w-2 shrink-0 cursor-col-resize"
    >
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/45" />
      <div className="absolute top-1/2 left-1/2 h-10 w-1 -translate-x-1/2 -translate-y-1/2 rounded-[6px] bg-border/50 opacity-0 transition-opacity hover:opacity-100" />
    </div>
  );
}
