'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSession } from '@/hooks/use-session';
import { useGenerationStore } from '@/store/generation-store';
import { cn } from '@/lib/utils';

type RunStep = {
  id: string;
  step_index: number;
  kind: string;
  agent_name: string;
  status: string;
  error: string | null;
  created_at: string;
};

type RunRow = {
  id: string;
  thread_id: string;
  status: string;
  objective: string | null;
  error: string | null;
  created_at: string;
  run_steps?: RunStep[] | null;
};

export function WorkspaceRunsPanel() {
  const { currentThreadId } = useGenerationStore();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadRuns = async () => {
    if (!currentThreadId) {
      setRuns([]);
      return;
    }
    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/runs?threadId=${encodeURIComponent(currentThreadId)}&limit=25`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const j = await res.json().catch(() => ({}));
      setRuns((j?.runs || []) as RunRow[]);
    } finally {
      setLoading(false);
    }
  };

  const createRun = async () => {
    if (!currentThreadId || creating) return;
    const objective = (window.prompt('Run objective', 'plan') || '').trim();
    if (!objective) return;

    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;

    setCreating(true);
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: currentThreadId,
          objective,
          enqueue: true,
          queue: 'default',
          priority: 100,
          metadata: { source: 'runs-panel' },
        }),
      });
      if (!res.ok) return;
      await loadRuns();
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => {
    loadRuns().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentThreadId]);

  const normalized = useMemo(() => {
    return (runs || []).map((r) => ({
      ...r,
      run_steps: (r.run_steps || []).slice().sort((a, b) => a.step_index - b.step_index),
    }));
  }, [runs]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text)]">
          Runs
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void createRun()}
            disabled={!currentThreadId || creating}
            className="h-7 px-2 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] bg-[var(--app-accent)] text-black hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'New Run'}
          </button>
          <button
            onClick={() => void loadRuns()}
            className="h-7 px-2 rounded-[6px] text-[11px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-2">
        {!currentThreadId && (
          <div className="text-[12px] text-[var(--app-text-dim)]">
            Select or create a thread to see runs.
          </div>
        )}

        {currentThreadId && loading && (
          <div className="text-[12px] text-[var(--app-text-dim)]">Loading…</div>
        )}

        {currentThreadId && !loading && normalized.length === 0 && (
          <div className="text-[12px] text-[var(--app-text-dim)]">No runs yet.</div>
        )}

        {normalized.map((run) => (
          <div
            key={run.id}
            className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3"
          >
            <div className="flex items-center gap-2">
              <StatusPill status={run.status} />
              <div className="text-[12px] font-medium text-[var(--app-text)] truncate">
                {(run.objective || '').trim() || 'run'}
              </div>
              <div className="ml-auto text-[10px] text-[var(--app-text-dim)]">
                {new Date(run.created_at).toLocaleString()}
              </div>
            </div>

            {run.error && (
              <div className="mt-2 text-[11px] text-[var(--app-danger)]">
                {run.error}
              </div>
            )}

            {(run.run_steps?.length || 0) > 0 && (
              <div className="mt-2 space-y-1.5">
                {run.run_steps!.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-5 text-right text-[var(--app-text-dim)] font-mono">
                      {s.step_index}
                    </span>
                    <span className="text-[var(--app-text-muted)]">
                      {s.kind}
                    </span>
                    <span className="text-[var(--app-text-dim)]">·</span>
                    <span className="text-[var(--app-text-dim)]">{s.agent_name}</span>
                    <span className="ml-auto">
                      <StatusPill status={s.status} small />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status, small }: { status: string; small?: boolean }) {
  const s = (status || '').toLowerCase();
  const tone =
    s === 'succeeded'
      ? 'ok'
      : s === 'failed'
        ? 'bad'
        : s === 'running'
          ? 'run'
          : s === 'queued' || s === 'leased'
            ? 'wait'
            : 'neutral';

  const cls =
    tone === 'ok'
      ? 'bg-[var(--app-success-soft)] text-[var(--app-success)] border-[var(--app-success)]/20'
      : tone === 'bad'
        ? 'bg-[var(--app-danger-soft)] text-[var(--app-danger)] border-[var(--app-danger)]/20'
        : tone === 'run'
          ? 'bg-[var(--app-info-soft)] text-[var(--app-info)] border-[var(--app-info)]/20'
          : tone === 'wait'
            ? 'bg-[var(--app-warning-soft)] text-[var(--app-warning)] border-[var(--app-warning)]/20'
            : 'bg-[var(--app-surface)] text-[var(--app-text-dim)] border-[var(--app-border)]';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[6px] border px-2 py-0.5 font-semibold uppercase tracking-[0.12em]',
        small ? 'text-[9px]' : 'text-[10px]',
        cls,
      )}
    >
      {status}
    </span>
  );
}
