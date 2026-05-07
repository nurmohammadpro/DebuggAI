'use client';

import { useState, useEffect, useCallback } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const token = session.access_token;
      const res = await fetch('/api/notifications?limit=20', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;

      const json = await res.json();
      setNotifications(json.notifications || []);
      setUnreadCount(
        (json.notifications || []).filter((n: Notification) => !n.is_read).length
      );
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ readAll: true }),
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      <button
        className="nav-notif relative"
        onClick={() => {
          setOpen(!open);
          if (!open) fetchNotifications();
        }}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-[var(--app-accent)] text-black text-[9px] font-bold px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-2 w-80 z-50 animate-slide-down"
            style={{
              background: 'var(--app-panel)',
              border: '1px solid var(--app-border-strong)',
              borderRadius: '10px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)]">
              <h3 className="text-[13px] font-medium text-[var(--app-text)]">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)] hover:opacity-80 transition-opacity"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--app-text-dim)]" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="h-6 w-6 text-[var(--app-text-dim)] mx-auto mb-2" />
                  <p className="text-[13px] text-[var(--app-text-muted)]">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-[var(--app-border)]/50 last:border-0 hover:bg-[var(--app-surface)]/50 transition-colors cursor-default ${
                      !n.is_read ? 'bg-[var(--app-accent-soft)]/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && (
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] mt-1.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-[13px] text-[var(--app-text)] font-medium truncate">
                          {n.title}
                        </p>
                        <p className="text-[12px] text-[var(--app-text-muted)] mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-[var(--app-text-dim)] mt-1.5">
                          {formatTimeAgo(n.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
