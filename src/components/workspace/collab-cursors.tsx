'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  color: string;
  lastSeen: number;
}

const CURSOR_COLORS = [
  '#00C853', '#448AFF', '#FF6D00', '#E040FB',
  '#00BCD4', '#FF5252', '#FFD600', '#76FF03',
];

/**
 * Hook that tracks and broadcasts user cursor position within a workspace.
 */
export function useCursorTracking(workspaceId: string, enabled = true) {
  const { user } = useSessionStore();
  const [remoteCursors, setRemoteCursors] = useState<CursorPosition[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastBroadcastRef = useRef(0);

  useEffect(() => {
    if (!workspaceId || !user || !enabled) return;

    const channel = supabase.channel(`cursors:${workspaceId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'cursor' }, (payload: any) => {
        const data = payload.payload as {
          x: number;
          y: number;
          userId: string;
          userName: string;
          color: string;
        };
        if (data.userId === user.id) return;

        setRemoteCursors((prev) => {
          const existing = prev.findIndex((c) => c.userId === data.userId);
          const cursor: CursorPosition = {
            ...data,
            lastSeen: Date.now(),
          };
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = cursor;
            return updated;
          }
          return [...prev, cursor];
        });
      })
      .subscribe();

    channelRef.current = channel;

    // Cleanup stale cursors (5 seconds timeout)
    const interval = setInterval(() => {
      const now = Date.now();
      setRemoteCursors((prev) => prev.filter((c) => now - c.lastSeen < 5000));
    }, 1000);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [workspaceId, user, enabled]);

  const broadcastCursor = useCallback(
    (x: number, y: number) => {
      if (!channelRef.current || !user || !enabled) return;

      const now = Date.now();
      if (now - lastBroadcastRef.current < 50) return; // Throttle to 50ms
      lastBroadcastRef.current = now;

      const colorIndex = user.id?.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) || 0;
      const color = CURSOR_COLORS[colorIndex % CURSOR_COLORS.length];

      channelRef.current.send({
        type: 'broadcast',
        event: 'cursor',
        payload: {
          x,
          y,
          userId: user.id,
          userName: user.displayName || user.email || 'Anonymous',
          color,
        },
      });
    },
    [user, enabled]
  );

  return { remoteCursors, broadcastCursor };
}

/**
 * Renders remote user cursors as floating indicators.
 */
export function CollabCursorOverlay({
  cursors,
}: {
  cursors: CursorPosition[];
}) {
  if (cursors.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute transition-all duration-75 ease-linear"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-4px, -4px)',
          }}
        >
          {/* Cursor arrow */}
          <svg
            width="16"
            height="20"
            viewBox="0 0 16 20"
            fill="none"
            style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.3))` }}
          >
            <path
              d="M0 0L13.66 15.25H8.63L11.18 18.5L9.77 19.5L7.06 16L4.54 20L3.16 19.28L5.67 15.25H0Z"
              fill={cursor.color}
            />
          </svg>
          {/* Name label */}
          <div
            className="absolute top-4 left-0 px-1.5 py-0.5 rounded-[4px] text-[9px] font-medium text-white whitespace-nowrap"
            style={{ background: cursor.color }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Collaborative status bar showing connected users.
 */
export function CollabStatusBar({
  cursors,
}: {
  cursors: CursorPosition[];
}) {
  const { user } = useSessionStore();

  // Merge own presence
  const allUsers = cursors.filter((c) => c.userId !== user?.id);
  const uniqueUsers = allUsers.filter(
    (c, i, arr) => arr.findIndex((u) => u.userId === c.userId) === i
  );

  if (uniqueUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-1">
        {uniqueUsers.slice(0, 5).map((cursor) => (
          <div
            key={cursor.userId}
            className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white ring-1 ring-[var(--app-panel)]"
            style={{ background: cursor.color }}
            title={`${cursor.userName} is editing`}
          >
            {cursor.userName.charAt(0).toUpperCase()}
          </div>
        ))}
        {uniqueUsers.length > 5 && (
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold bg-[var(--app-surface)] border border-[var(--app-border)] text-[var(--app-text-dim)]">
            +{uniqueUsers.length - 5}
          </div>
        )}
      </div>
      <span className="text-[9px] text-[var(--app-text-dim)] font-medium">
        {uniqueUsers.length} online
      </span>
    </div>
  );
}
