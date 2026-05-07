'use client';

import { useState, useEffect, useCallback } from 'react';
import { MailIcon, Loader2, Trash2 } from 'lucide-react';

interface Subscriber {
  id: string;
  email: string;
  subscribed: boolean;
  created_at: string;
}

export function AdminNewsletter() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/newsletter?limit=100');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setSubscribers(json.subscribers || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load subscribers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  const toggleSubscription = async (id: string, current: boolean) => {
    try {
      await fetch('/api/admin/newsletter', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, subscribed: !current }),
      });
      setSubscribers((prev) =>
        prev.map((s) => (s.id === id ? { ...s, subscribed: !current } : s))
      );
    } catch {
      // ignore
    }
  };

  const active = subscribers.filter((s) => s.subscribed).length;

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
    <div>
      <div className="flex items-center gap-4 mb-6">
        <div className="px-4 py-3 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
            Total
          </div>
          <div className="text-[20px] font-semibold text-[var(--app-text)]">
            {subscribers.length}
          </div>
        </div>
        <div className="px-4 py-3 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
            Active
          </div>
          <div className="text-[20px] font-semibold" style={{ color: 'var(--app-accent)' }}>
            {active}
          </div>
        </div>
      </div>

      {subscribers.length === 0 ? (
        <div className="text-center py-16">
          <MailIcon className="h-8 w-8 text-[var(--app-text-dim)] mx-auto mb-3" />
          <p className="text-[13px] text-[var(--app-text-muted)]">No subscribers yet</p>
        </div>
      ) : (
        <div className="rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--app-border)]">
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    Email
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    Subscribed
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {subscribers.map((s) => (
                  <tr key={s.id} className="border-b border-[var(--app-border)]/50 last:border-0">
                    <td className="px-4 py-2.5 text-[13px] text-[var(--app-text)] font-mono">
                      {s.email}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-[4px] text-[10px] font-semibold uppercase tracking-[0.12em] ${
                          s.subscribed
                            ? 'bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                            : 'bg-[var(--app-surface)] text-[var(--app-text-dim)]'
                        }`}
                      >
                        {s.subscribed ? 'Active' : 'Unsubscribed'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[11px] text-[var(--app-text-dim)]">
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleSubscription(s.id, s.subscribed)}
                        className="h-7 px-2 rounded-[6px] text-[11px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                      >
                        {s.subscribed ? 'Unsubscribe' : 'Resubscribe'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
