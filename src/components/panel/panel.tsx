'use client';

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface PanelProps {
  children: ReactNode;
  /** Unique id for animation keys */
  id: string;
  /** Which side the panel attaches to (affects animation direction) */
  side: 'left' | 'right';
  /** Width when rendered inline (desktop) */
  defaultWidth?: number;
  /** Minimum width (only enforced for right-side panels) */
  minWidth?: number;
  /** Extra classes on the inline wrapper */
  className?: string;

  // --- Collapse ---
  collapsed?: boolean;
  collapsedChildren?: ReactNode;
  onToggleCollapsed?: () => void;

  // --- Mobile overlay ---
  mobile?: boolean;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/**
 * Reusable panel wrapper that renders in one of three modes:
 *
 * 1. **Collapsed** – a narrow 40px strip showing `collapsedChildren`
 * 2. **Inline** – a regular-width `<aside>` panel
 * 3. **Mobile overlay** – an animated full-screen drawer from the left or right
 *
 * The component is **controlled** — the parent owns open/collapsed state.
 */
export function Panel({
  children,
  id,
  side,
  defaultWidth = 320,
  minWidth,
  collapsed = false,
  collapsedChildren,
  onToggleCollapsed,
  mobile = false,
  mobileOpen = false,
  onMobileClose,
  className,
}: PanelProps) {
  useEffect(() => {
    if (!mobile || !mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobile, mobileOpen]);

  /* ── Collapsed (desktop) ──────────────────────────────────── */
  if (collapsed && !mobile) {
    return (
      <aside
        className={cn(
          'w-10 bg-[var(--app-panel)] flex items-center justify-center',
        )}
      >
        {collapsedChildren ?? (
          <button
            className="h-8 w-8 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors"
            title="Expand panel"
            onClick={onToggleCollapsed}
          >
            <ChevronRight
              className={cn(
                'h-4 w-4 text-[var(--app-text-dim)]',
                side === 'right' && 'rotate-180',
              )}
            />
          </button>
        )}
      </aside>
    );
  }

  /* ── Mobile overlay ────────────────────────────────────────── */
  if (mobile) {
    return (
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key={`panel-mobile-${id}`}
            className="fixed inset-0 z-50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {/* Scrim — full screen */}
            <div
              className="absolute inset-0 bg-black/45 pointer-events-auto"
              onClick={onMobileClose}
            />
            {/* Drawer — full viewport height */}
            <motion.div
              className={cn(
                'absolute inset-0 flex flex-col',
                'bg-[var(--app-panel)]',
                'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
                'shadow-[0_18px_55px_rgba(0,0,0,0.35)] overflow-hidden',
                side === 'left'
                  ? 'w-[min(320px,100vw)]'
                  : 'w-[min(720px,100vw)]',
                side === 'right' && 'left-auto',
              )}
              initial={{ x: side === 'left' ? -24 : 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: side === 'left' ? -24 : 24, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'auto' }}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  /* ── Inline (desktop) ──────────────────────────────────────── */
  return (
    <aside
      className={cn(
        'bg-[var(--app-panel)] flex flex-col min-h-0 h-full',
        className,
      )}
      style={{ width: defaultWidth, minWidth: minWidth ?? (side === 'right' ? 320 : undefined) }}
    >
      {children}
    </aside>
  );
}
