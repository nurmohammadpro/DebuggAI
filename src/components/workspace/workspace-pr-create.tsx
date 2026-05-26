'use client';

import { useState } from 'react';
import { GitPullRequest, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { csrfHeader } from '@/lib/csrf-client';

interface Branch {
  id: string;
  name: string;
}

export function WorkspacePRCreate({
  projectId,
  branches,
  onCreated,
  onClose,
}: {
  projectId: string;
  branches: Branch[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const [fromBranch, setFromBranch] = useState('');
  const [toBranch, setToBranch] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!fromBranch || !toBranch || !title) {
      toast.error('Please fill required fields');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/projects/${projectId}/pull-requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        ...csrfHeader(),
        },
        body: JSON.stringify({
          from_branch_id: fromBranch,
          to_branch_id: toBranch,
          title,
          description: description || undefined,
        }),
      });

      if (res.ok) {
        toast.success('Pull request created');
        onCreated();
      } else {
        const json = await res.json();
        toast.error(json.error || 'Failed to create PR');
      }
    } catch {
      toast.error('Failed to create pull request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <GitPullRequest className="h-4 w-4" style={{ color: 'var(--app-accent)' }} />
        <h3 className="text-[13px] font-medium text-[var(--app-text)]">New Pull Request</h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
            From
          </label>
          <select
            value={fromBranch}
            onChange={(e) => setFromBranch(e.target.value)}
            className="w-full h-9 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] px-3 text-[13px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]/30"
          >
            <option value="">Select source branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
            To
          </label>
          <select
            value={toBranch}
            onChange={(e) => setToBranch(e.target.value)}
            className="w-full h-9 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] px-3 text-[13px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]/30"
          >
            <option value="">Select target branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
            Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="PR title"
            className="w-full h-9 rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] px-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)]/30"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="PR description (optional)"
            rows={3}
            className="w-full rounded-[6px] bg-[var(--app-panel-2)] border border-[var(--app-border)] px-3 py-2 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:border-[var(--app-accent)]/30 resize-none"
          />
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
          onClick={handleSubmit}
          disabled={submitting || !fromBranch || !toBranch || !title}
          className="h-8 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight bg-[var(--app-accent)] text-black hover:opacity-90 disabled:opacity-40 inline-flex items-center gap-2"
        >
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Create PR
        </button>
      </div>
    </div>
  );
}
