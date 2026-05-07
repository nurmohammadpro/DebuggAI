'use client';

import { useState } from 'react';
import { UserPlus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function WorkspaceInviteDialog({
  workspaceId,
  onClose,
}: {
  workspaceId: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/workspaces/${workspaceId}/invitations`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      if (res.ok) {
        toast.success('Invitation sent');
        onClose();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to send invitation');
      }
    } catch {
      toast.error('Failed to send invitation');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4" style={{ color: 'var(--app-accent)' }} />
        <h3 className="text-[13px] font-medium text-[var(--app-text)]">Invite Member</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
            Email
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="colleague@example.com"
            className="w-full h-9 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] px-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)]/30"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full h-9 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] px-3 text-[13px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]/30"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--app-border)]">
        <button
          onClick={onClose}
          className="h-8 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)]"
        >
          Cancel
        </button>
        <button
          onClick={handleInvite}
          disabled={sending || !email.trim()}
          className="h-8 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight bg-[var(--app-accent)] text-black hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-2"
        >
          {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Send Invite
        </button>
      </div>
    </div>
  );
}
