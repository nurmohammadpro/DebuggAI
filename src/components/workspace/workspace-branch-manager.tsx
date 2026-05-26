'use client';

import { useState, useEffect, useCallback } from 'react';
import { GitBranch, Plus, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useWorkspaceStore } from '@/store/workspace-store';
import { csrfHeader } from '@/lib/csrf-client';

interface Branch {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  is_locked: boolean;
  created_by: string;
  created_at: string;
  commit_count: number;
  open_pr_count: number;
}

export function WorkspaceBranchManager({ projectId }: { projectId: string }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/projects/${projectId}/branches`, {
        headers: { Authorization: `Bearer ${session.access_token}`, ...csrfHeader() },
      });
      if (res.ok) {
        const json = await res.json();
        setBranches(json.branches || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const createBranch = async () => {
    const name = window.prompt('Branch name:');
    if (!name) return;

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/projects/${projectId}/branches`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        ...csrfHeader(),
        },
        body: JSON.stringify({ name }),
      });
      if (res.ok) fetchBranches();
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--app-text-dim)]" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--app-border)] flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-muted)]">
          Branches
        </span>
        <button
          onClick={createBranch}
          disabled={creating}
          className="h-7 w-7 rounded-[6px] hover:bg-[var(--app-surface)] flex items-center justify-center transition-colors disabled:opacity-40"
          title="New branch"
        >
          <Plus className="h-3.5 w-3.5 text-[var(--app-text-dim)]" />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-0.5">
        {branches.length === 0 ? (
          <div className="text-[12px] text-[var(--app-text-muted)] text-center py-6">
            No branches yet.
          </div>
        ) : (
          branches.map((b) => (
            <div
              key={b.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] hover:bg-[var(--app-surface)] transition-colors border border-transparent hover:border-[var(--app-border)]"
            >
              <GitBranch className="h-4 w-4 text-[var(--app-text-dim)] shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[var(--app-text)] font-mono">{b.name}</span>
                  {b.is_default && (
                    <span className="text-[9px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[4px] bg-[var(--app-accent-soft)] text-[var(--app-accent)]">
                      default
                    </span>
                  )}
                </div>
                {b.description && (
                  <p className="text-[11px] text-[var(--app-text-muted)] truncate mt-0.5">{b.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-[var(--app-text-dim)]">
                {b.open_pr_count > 0 && (
                  <span className="px-1.5 py-0.5 rounded-[4px] bg-[var(--app-warning)]/10 text-[var(--app-warning)]">
                    {b.open_pr_count} PR
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
