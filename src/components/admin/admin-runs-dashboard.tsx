'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, XCircle, RefreshCw, ChevronLeft, ChevronRight, Loader2, Play, AlertCircle } from 'lucide-react';
import { getAdminAuthHeaders } from '@/hooks/queries/use-admin-auth';

interface Run {
  id: string;
  thread_id: string;
  user_id: string;
  user_email: string;
  status: string;
  objective: string;
  error: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RunDetail extends Run {
  user_plan?: string;
  steps: Array<{
    id: string;
    step_index: number;
    kind: string;
    status: string;
    error: string | null;
    input: any;
    output: any;
    started_at: string | null;
    ended_at: string | null;
  }>;
  jobs: Array<{
    id: string;
    kind: string;
    status: string;
    attempts: number;
    max_attempts: number;
    last_error: string | null;
    timeout_seconds: number;
    created_at: string;
  }>;
}

export function AdminRunsDashboard() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedRun, setSelectedRun] = useState<RunDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const limit = 25;

  const fetchRuns = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: String(limit), page: String(page) });
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/runs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch runs');
      const data = await res.json();
      setRuns(data.runs || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const fetchDetail = async (runId: string) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/admin/runs/${runId}`);
      if (!res.ok) throw new Error('Failed to fetch run detail');
      const data = await res.json();
      setSelectedRun(data.run ? { ...data.run, steps: data.steps, jobs: data.jobs } : null);
    } catch {
      // ignore
    } finally {
      setDetailLoading(false);
    }
  };

  const performAction = async (runId: string, action: 'cancel' | 'retry') => {
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`/api/admin/runs/${runId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Failed to ${action} run`);
      await fetchRuns();
      if (selectedRun?.id === runId) fetchDetail(runId);
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action}`);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'succeeded': return 'var(--app-success)';
      case 'running': return 'var(--app-info)';
      case 'queued': return 'var(--app-warning)';
      case 'failed': return 'var(--app-danger)';
      case 'canceled': return 'var(--app-text-dim)';
      default: return 'var(--app-text-muted)';
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Play className="h-4 w-4 text-[var(--app-accent)]" />
          <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">Runs &amp; Jobs</h1>
        </div>
        <p className="text-[13px] text-[var(--app-text-muted)] mt-1">
          Inspect, cancel, and retry agent runs across all users
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--app-text-dim)]" />
          <input
            type="text"
            placeholder="Search by objective or error…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="w-full h-9 pl-8 pr-3 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[13px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="h-9 px-3 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[13px] text-[var(--app-text)] outline-none"
        >
          <option value="">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="running">Running</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="canceled">Canceled</option>
        </select>
        <button
          onClick={fetchRuns}
          className="h-9 w-9 rounded-[6px] inline-flex items-center justify-center border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-[6px] border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/5 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-[var(--app-danger)] shrink-0" />
          <p className="text-[13px] text-[var(--app-danger)]">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-[var(--app-text-dim)] hover:text-[var(--app-text)]">
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Run list */}
      <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--app-text-dim)]" />
          </div>
        ) : runs.length === 0 ? (
          <div className="text-center py-12 text-[13px] text-[var(--app-text-muted)]">No runs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[var(--app-border)]">
                  <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Run ID</th>
                  <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">User</th>
                  <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Objective</th>
                  <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Status</th>
                  <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Created</th>
                  <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr
                    key={run.id}
                    className={`border-b border-[var(--app-border)]/50 last:border-0 hover:bg-[var(--app-surface)] cursor-pointer ${
                      selectedRun?.id === run.id ? 'bg-[var(--app-accent-soft)]' : ''
                    }`}
                    onClick={() => fetchDetail(run.id)}
                  >
                    <td className="px-4 py-2 text-[11px] font-mono text-[var(--app-text)]">{run.id.slice(0, 8)}…</td>
                    <td className="px-4 py-2 text-[13px] text-[var(--app-text)]">{run.user_email}</td>
                    <td className="px-4 py-2 text-[13px] text-[var(--app-text)] max-w-[200px] truncate">{run.objective}</td>
                    <td className="px-4 py-2">
                      <span
                        className="inline-flex text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-[6px]"
                        style={{ background: `${statusColor(run.status)}18`, color: statusColor(run.status) }}
                      >
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-[11px] text-[var(--app-text-dim)]">
                      {new Date(run.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {(run.status === 'queued' || run.status === 'running') && (
                          <button
                            onClick={() => performAction(run.id, 'cancel')}
                            className="h-7 px-2 rounded-[6px] text-[11px] font-medium border border-[var(--app-danger)]/30 text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        {run.status === 'failed' && (
                          <button
                            onClick={() => performAction(run.id, 'retry')}
                            className="h-7 px-2 rounded-[6px] text-[11px] font-medium border border-[var(--app-accent)]/30 text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10 transition-colors"
                          >
                            Retry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[13px] text-[var(--app-text-muted)]">
          <span>{total} total runs</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="h-8 w-8 rounded-[6px] inline-flex items-center justify-center border border-[var(--app-border)] disabled:opacity-30 hover:bg-[var(--app-surface)] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-[13px]">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 w-8 rounded-[6px] inline-flex items-center justify-center border border-[var(--app-border)] disabled:opacity-30 hover:bg-[var(--app-surface)] transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {detailLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--app-text-dim)]" />
        </div>
      )}
      {selectedRun && !detailLoading && (
        <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[16px] font-medium text-[var(--app-text)]">Run Detail</h3>
            <button onClick={() => setSelectedRun(null)} className="text-[var(--app-text-dim)] hover:text-[var(--app-text)]">
              <XCircle className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
            <div><span className="text-[var(--app-text-dim)]">ID:</span> <span className="font-mono text-[var(--app-text)]">{selectedRun.id}</span></div>
            <div><span className="text-[var(--app-text-dim)]">User:</span> <span className="text-[var(--app-text)]">{selectedRun.user_email}</span></div>
            <div><span className="text-[var(--app-text-dim)]">Plan:</span> <span className="text-[var(--app-text)]">{selectedRun.user_plan || '-'}</span></div>
            <div><span className="text-[var(--app-text-dim)]">Status:</span> <span style={{ color: statusColor(selectedRun.status) }}>{selectedRun.status}</span></div>
          </div>

          {selectedRun.error && (
            <div className="p-3 rounded-[6px] bg-[var(--app-danger)]/5 border border-[var(--app-danger)]/20">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-danger)] mb-1">Error</p>
              <p className="text-[13px] text-[var(--app-text)] font-mono">{selectedRun.error}</p>
            </div>
          )}

          {/* Steps */}
          {selectedRun.steps.length > 0 && (
            <div>
              <h4 className="text-[13px] font-medium text-[var(--app-text)] mb-2">Steps ({selectedRun.steps.length})</h4>
              <div className="space-y-1">
                {selectedRun.steps.map((step) => (
                  <div key={step.id} className="flex items-center gap-3 px-3 py-2 rounded-[6px] bg-[var(--app-surface)]">
                    <span className="text-[11px] font-semibold text-[var(--app-text-dim)] w-6">#{step.step_index}</span>
                    <span className="text-[11px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[4px] bg-[var(--app-panel-2)] text-[var(--app-text-muted)]">{step.kind}</span>
                    <span
                      className="text-[11px] font-semibold"
                      style={{ color: statusColor(step.status) }}
                    >
                      {step.status}
                    </span>
                    {step.error && <span className="text-[11px] text-[var(--app-danger)] truncate">{step.error}</span>}
                    <span className="ml-auto text-[10px] text-[var(--app-text-dim)]">
                      {step.started_at ? new Date(step.started_at).toLocaleTimeString() : '-'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jobs */}
          {selectedRun.jobs.length > 0 && (
            <div>
              <h4 className="text-[13px] font-medium text-[var(--app-text)] mb-2">Jobs ({selectedRun.jobs.length})</h4>
              <div className="space-y-1">
                {selectedRun.jobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-3 px-3 py-2 rounded-[6px] bg-[var(--app-surface)]">
                    <span className="text-[11px] uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[4px] bg-[var(--app-panel-2)] text-[var(--app-text-muted)]">{job.kind}</span>
                    <span style={{ color: statusColor(job.status) }} className="text-[11px] font-semibold">{job.status}</span>
                    <span className="text-[10px] text-[var(--app-text-dim)]">attempt {job.attempts}/{job.max_attempts}</span>
                    {job.last_error && <span className="text-[11px] text-[var(--app-danger)] truncate">{job.last_error}</span>}
                    <span className="ml-auto text-[10px] text-[var(--app-text-dim)]">{job.timeout_seconds}s timeout</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
