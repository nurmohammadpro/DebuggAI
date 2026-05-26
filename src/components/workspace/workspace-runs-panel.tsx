'use client';

import { useEffect, useMemo, useState } from 'react';
import { getSession } from '@/hooks/use-session';
import { useGenerationStore } from '@/store/generation-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { csrfHeader } from '@/lib/csrf-client';

type RunStep = {
  id: string;
  step_index: number;
  kind: string;
  agent_name: string;
  status: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  error: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

type RunRow = {
  id: string;
  thread_id: string;
  status: string;
  objective: string | null;
  error: string | null;
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  run_steps?: RunStep[] | null;
};

export function WorkspaceRunsPanel() {
  const { currentThreadId } = useGenerationStore();
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [executingRunId, setExecutingRunId] = useState<string | null>(null);
  const [cancellingRunId, setCancellingRunId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

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
        headers: { Authorization: `Bearer ${token}`, ...csrfHeader() },
      });
      if (!res.ok) return;
      const j = await res.json().catch(() => ({}));
      // Fetch full detail for each run to get step input/output/timing
      const detailed: RunRow[] = [];
      for (const run of (j?.runs || [])) {
        try {
          const dr = await fetch(`/api/runs/${encodeURIComponent(run.id)}`, {
            headers: { Authorization: `Bearer ${token}`, ...csrfHeader() },
          });
          if (dr.ok) {
            const dj = await dr.json().catch(() => null);
            if (dj?.run) detailed.push({ ...dj.run, run_steps: dj.steps || [] });
            else detailed.push(run as RunRow);
          } else {
            detailed.push(run as RunRow);
          }
        } catch {
          detailed.push(run as RunRow);
        }
      }
      setRuns(detailed);
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
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...csrfHeader() },
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

  const executeRun = async (runId: string) => {
    if (!runId || executingRunId) return;
    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;

    setExecutingRunId(runId);
    try {
      const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/execute`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...csrfHeader() },
        body: JSON.stringify({ limit: 10, leaseSeconds: 60 }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j?.error === 'string' ? j.error : 'Failed to execute run');
        return;
      }

      const leasedCount = Array.isArray(j?.leased) ? j.leased.length : 0;
      toast.success(leasedCount > 0 ? `Executing ${leasedCount} job(s)` : 'No queued jobs to execute');
      await loadRuns();
    } finally {
      setExecutingRunId(null);
    }
  };

  const cancelRun = async (runId: string) => {
    if (!runId || cancellingRunId) return;
    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;

    setCancellingRunId(runId);
    try {
      const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...csrfHeader() },
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j?.error === 'string' ? j.error : 'Failed to cancel run');
        return;
      }
      toast.success('Run canceled');
      await loadRuns();
    } finally {
      setCancellingRunId(null);
    }
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
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

            {(run.status === 'queued' || run.status === 'running') && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => void executeRun(run.id)}
                  disabled={executingRunId !== null}
                  className="h-7 px-2 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors disabled:opacity-50"
                >
                  {executingRunId === run.id ? 'Executing…' : 'Execute'}
                </button>
                <button
                  onClick={() => void cancelRun(run.id)}
                  disabled={cancellingRunId !== null}
                  className="h-7 px-2 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] border border-[var(--app-danger)]/30 text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10 transition-colors disabled:opacity-50"
                >
                  {cancellingRunId === run.id ? 'Cancelling…' : 'Cancel'}
                </button>
              </div>
            )}

            {(run.run_steps?.length || 0) > 0 && (
              <div className="mt-2 space-y-1">
                {run.run_steps!.map((s) => {
                  const isExpanded = expandedSteps.has(s.id);
                  const duration = s.started_at && s.ended_at
                    ? `${Math.round((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000)}s`
                    : null;
                  return (
                    <div key={s.id}>
                      <button
                        onClick={() => toggleStep(s.id)}
                        className="w-full flex items-center gap-2 text-[11px] py-0.5 px-1 rounded hover:bg-[var(--app-surface)] transition-colors"
                      >
                        <span className="w-5 text-right text-[var(--app-text-dim)] font-mono">
                          {s.step_index}
                        </span>
                        <span className="text-[var(--app-text-muted)]">{s.kind}</span>
                        <span className="text-[var(--app-text-dim)]">·</span>
                        <span className="text-[var(--app-text-dim)]">{s.agent_name}</span>
                        {duration && (
                          <span className="text-[10px] text-[var(--app-text-dim)] ml-1">{duration}</span>
                        )}
                        <span className="ml-auto">
                          <StatusPill status={s.status} small />
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="ml-7 mt-1 mb-1 text-[10px] space-y-1">
                          {s.error && (
                            <div className="text-[var(--app-danger)] bg-[var(--app-danger-soft)] rounded-[6px] p-2">
                              {s.error}
                            </div>
                          )}
                          {s.input && Object.keys(s.input).length > 0 && (
                            <details className="text-[var(--app-text-dim)]">
                              <summary className="cursor-pointer">Input</summary>
                              <pre className="mt-1 text-[10px] whitespace-pre-wrap break-all bg-[var(--app-surface)] rounded-[6px] p-2 max-h-32 overflow-auto">
                                {JSON.stringify(s.input, null, 2)}
                              </pre>
                            </details>
                          )}
                          {s.output && Object.keys(s.output).length > 0 && (
                            <details className="text-[var(--app-text-dim)]">
                              <summary className="cursor-pointer">Output</summary>
                              <pre className="mt-1 text-[10px] whitespace-pre-wrap break-all bg-[var(--app-surface)] rounded-[6px] p-2 max-h-48 overflow-auto">
                                {JSON.stringify(s.output, null, 2)}
                              </pre>
                            </details>
                          )}
                          {s.started_at && (
                            <div className="text-[var(--app-text-dim)]">
                              Started: {new Date(s.started_at).toLocaleString()}
                            </div>
                          )}
                          {s.ended_at && (
                            <div className="text-[var(--app-text-dim)]">
                              Ended: {new Date(s.ended_at).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
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
            : 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border-[var(--app-border)]';

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
