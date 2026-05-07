'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';

interface PresenceUser {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string;
}

const AVATAR_COLORS = ['#00C853', '#448AFF', '#FF6D00', '#E040FB', '#00BCD4', '#FF5252'];

export function WorkspacePresence({ workspaceId }: { workspaceId: string }) {
  const { user } = useSessionStore();
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    if (!workspaceId || !user) return;

    const channel = supabase.channel(`workspace:${workspaceId}`, {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: PresenceUser[] = [];
        for (const [_, value] of Object.entries(state)) {
          const p = (value as any[])[0];
          if (p) users.push(p);
        }
        setPresentUsers(users);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, user]);

  if (presentUsers.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 -space-x-1">
      {presentUsers.map((u, i) => (
        <div
          key={u.id}
          className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-[var(--app-panel)]"
          style={{ background: u.avatarColor, zIndex: presentUsers.length - i }}
          title={u.displayName || u.email}
        >
          {(u.displayName || u.email)[0].toUpperCase()}
        </div>
      ))}
    </div>
  );
}
