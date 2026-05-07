'use client';

import { useState, useEffect, useCallback } from 'react';
import { MessageSquareIcon, Loader2, CheckCircle2 } from 'lucide-react';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function AdminContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/contact-messages?limit=50');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setMessages(json.messages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const markAsRead = async (ids: string[]) => {
    try {
      await fetch('/api/admin/contact-messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      setMessages((prev) =>
        prev.map((m) => (ids.includes(m.id) ? { ...m, read: true } : m))
      );
    } catch {
      // ignore
    }
  };

  const unread = messages.filter((m) => !m.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--app-text-dim)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-[8px] border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/5">
        <p className="text-[13px] text-[var(--app-danger)]">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Message List */}
      <div className="w-[360px] shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-medium text-[var(--app-text)]">
            Messages
            {unread > 0 && (
              <span className="ml-2 text-[11px] font-semibold text-[var(--app-accent)]">
                {unread} unread
              </span>
            )}
          </h2>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-[var(--app-text-muted)]">
            <MessageSquareIcon className="h-6 w-6 mx-auto mb-2 text-[var(--app-text-dim)]" />
            No messages yet
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setSelected(m);
                  if (!m.read) markAsRead([m.id]);
                }}
                className={`w-full text-left px-3 py-3 rounded-[8px] transition-colors border ${
                  selected?.id === m.id
                    ? 'bg-[var(--app-surface)] border-[var(--app-border)]'
                    : 'bg-transparent border-transparent hover:bg-[var(--app-surface)]/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {!m.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)] shrink-0" />
                  )}
                  <span className="text-[13px] font-medium text-[var(--app-text)] truncate">
                    {m.name || 'Anonymous'}
                  </span>
                </div>
                <p className="text-[12px] text-[var(--app-text-muted)] truncate mt-0.5">
                  {m.message.slice(0, 80)}
                </p>
                <p className="text-[10px] text-[var(--app-text-dim)] mt-1">
                  {new Date(m.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Detail */}
      <div className="flex-1 min-w-0">
        {selected ? (
          <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[16px] font-medium text-[var(--app-text)]">
                  {selected.name || 'Anonymous'}
                </h3>
                <p className="text-[13px] text-[var(--app-text-muted)]">{selected.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {selected.read ? (
                  <span className="text-[11px] text-[var(--app-text-dim)] inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Read
                  </span>
                ) : (
                  <button
                    onClick={() => markAsRead([selected.id])}
                    className="h-7 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)]"
                  >
                    Mark read
                  </button>
                )}
                <span className="text-[11px] text-[var(--app-text-dim)]">
                  {new Date(selected.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="p-4 rounded-[8px] bg-[var(--app-panel-2)] border border-[var(--app-border)]">
              <p className="text-[13px] text-[var(--app-text)] whitespace-pre-wrap">
                {selected.message}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center py-16">
            <div>
              <MessageSquareIcon className="h-8 w-8 text-[var(--app-text-dim)] mx-auto mb-3" />
              <p className="text-[13px] text-[var(--app-text-muted)]">
                Select a message to view
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
