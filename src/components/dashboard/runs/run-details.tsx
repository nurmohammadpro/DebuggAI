'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ArrowLeft, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { toast } from 'sonner';

import { useRunDetails } from '@/hooks/queries/use-run-details';

function tone(status: string) {
  if (status === 'succeeded') return 'bg-[var(--app-success-soft)] text-[var(--app-success)] border border-[var(--app-success)]/20';
  if (status === 'failed') return 'bg-[var(--app-danger-soft)] text-[var(--app-danger)] border border-[var(--app-danger)]/20';
  if (status === 'running') return 'bg-[var(--app-info-soft)] text-[var(--app-info)] border border-[var(--app-info)]/20';
  if (status === 'queued') return 'bg-[var(--app-warning-soft)] text-[var(--app-warning)] border border-[var(--app-warning)]/20';
  return 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border border-[var(--app-border)]';
}

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? '');
  }
}

export function RunDetails({ runId }: { runId: string | undefined }) {
  const { data, isLoading, error } = useRunDetails(runId, true);
  const [openStep, setOpenStep] = useState<string | null>(null);

  const steps = data?.steps || [];
  const toolCalls = data?.toolCalls || [];
  const artifacts = data?.artifacts || [];
  const run = data?.run;

  const toolCallsByStep = useMemo(() => {
    const map = new Map<string, typeof toolCalls>();
    for (const tc of toolCalls) {
      const key = tc.run_step_id;
      const prev = map.get(key) || [];
      prev.push(tc);
      map.set(key, prev);
    }
    return map;
  }, [toolCalls]);

  if (!runId) {
    return (
      <div className="p-4 sm:p-6">
        <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-[13px] text-[var(--app-text-muted)]">
          Missing run id.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            href="/dashboard/runs"
            className="inline-flex items-center gap-2 text-[12px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to runs
          </Link>
          <div className="mt-2 flex items-center gap-2 min-w-0">
            <div className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)] truncate">
              {(run?.objective || '').trim() || 'Run'}
            </div>
            {run?.status && (
              <span className={`shrink-0 rounded-[999px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${tone(run.status)}`}>
                {run.status}
              </span>
            )}
          </div>
          <div className="text-[12px] text-[var(--app-text-muted)] mt-1">
            Created {run?.created_at ? formatDistanceToNowStrict(new Date(run.created_at), { addSuffix: true }) : '—'} · Run ID {runId.slice(0, 8)}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
          <div className="text-sm font-medium text-[var(--app-text)]">Failed to load run</div>
          <div className="text-xs text-[var(--app-text-muted)] mt-1">
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 text-[12px] text-[var(--app-text-muted)]">
          Loading run…
        </div>
      )}

      {!isLoading && !error && run && (
        <>
          {run.error && (
            <div className="rounded-[6px] border border-[var(--app-danger)]/25 bg-[var(--app-danger-soft)] p-4">
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--app-danger)]">
                Run error
              </div>
              <div className="mt-2 text-[13px] text-[var(--app-danger)] whitespace-pre-wrap">
                {run.error}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-[1fr,360px] gap-4 items-start">
            <div className="space-y-3">
              <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--app-border)]">
                  <div className="text-xs font-medium text-[var(--app-text)]">Steps</div>
                  <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">
                    Agent-level actions and tool calls.
                  </div>
                </div>

                <div className="divide-y divide-[var(--app-border)]">
                  {steps.length === 0 && (
                    <div className="p-4 text-[12px] text-[var(--app-text-muted)]">
                      No steps yet.
                    </div>
                  )}

                  {steps.map((s) => {
                    const open = openStep === s.id;
                    const stepToolCalls = toolCallsByStep.get(s.id) || [];
                    return (
                      <div key={s.id}>
                        <button
                          onClick={() => setOpenStep((prev) => (prev === s.id ? null : s.id))}
                          className="w-full px-3 py-3 hover:bg-[var(--app-surface)] transition-colors text-left"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {open ? (
                                  <ChevronDown className="h-4 w-4 text-[var(--app-text-dim)]" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-[var(--app-text-dim)]" />
                                )}
                                <div className="text-[13px] font-medium text-[var(--app-text)]">
                                  Step {s.step_index}: {s.kind}
                                </div>
                                <span className="text-[11px] text-[var(--app-text-dim)]">
                                  {s.agent_name}
                                </span>
                              </div>
                              <div className="text-[11px] text-[var(--app-text-dim)] mt-1">
                                {formatDistanceToNowStrict(new Date(s.created_at), { addSuffix: true })}
                                {stepToolCalls.length > 0 ? ` · ${stepToolCalls.length} tool call${stepToolCalls.length === 1 ? '' : 's'}` : ''}
                              </div>
                            </div>
                            <span className={`shrink-0 rounded-[999px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${tone(s.status)}`}>
                              {s.status}
                            </span>
                          </div>
                        </button>

                        {open && (
                          <div className="px-3 pb-3">
                            {s.error && (
                              <div className="rounded-[6px] border border-[var(--app-danger)]/25 bg-[var(--app-danger-soft)] p-3 text-[12px] text-[var(--app-danger)] whitespace-pre-wrap">
                                {s.error}
                              </div>
                            )}

                            <div className="mt-3 grid gap-3">
                              <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] overflow-hidden">
                                <div className="px-3 py-2 border-b border-[var(--app-border)] flex items-center justify-between">
                                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Output</div>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await navigator.clipboard.writeText(prettyJson(s.output));
                                        toast.success('Copied');
                                      } catch {
                                        toast.message('Copy failed');
                                      }
                                    }}
                                    className="h-7 px-2 rounded-[6px] border border-[var(--app-border)] text-[11px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors inline-flex items-center gap-2"
                                  >
                                    <Copy className="h-3.5 w-3.5" />
                                    Copy
                                  </button>
                                </div>
                                <pre className="p-3 text-[11px] text-[var(--app-text)] overflow-x-auto whitespace-pre-wrap">
                                  {prettyJson(s.output)}
                                </pre>
                              </div>

                              {stepToolCalls.length > 0 && (
                                <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] overflow-hidden">
                                  <div className="px-3 py-2 border-b border-[var(--app-border)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                                    Tool calls
                                  </div>
                                  <div className="divide-y divide-[var(--app-border)]">
                                    {stepToolCalls.map((tc) => (
                                      <div key={tc.id} className="p-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="text-[12px] font-medium text-[var(--app-text)]">
                                            {tc.tool_name}
                                          </div>
                                          <span className={`shrink-0 rounded-[999px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${tone(tc.status)}`}>
                                            {tc.status}
                                          </span>
                                        </div>
                                        {tc.error && (
                                          <div className="mt-2 text-[11px] text-[var(--app-danger)] whitespace-pre-wrap">
                                            {tc.error}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
                <div className="px-3 py-2 border-b border-[var(--app-border)]">
                  <div className="text-xs font-medium text-[var(--app-text)]">Artifacts</div>
                  <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">
                    Logs, exports, diffs, and reports linked to this run.
                  </div>
                </div>
                {artifacts.length === 0 ? (
                  <div className="p-4 text-[12px] text-[var(--app-text-muted)]">No artifacts yet.</div>
                ) : (
                  <div className="divide-y divide-[var(--app-border)]">
                    {artifacts.slice(0, 12).map((a) => (
                      <div key={a.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium text-[var(--app-text)] line-clamp-1">
                              {a.kind}
                            </div>
                            <div className="text-[11px] text-[var(--app-text-dim)] mt-0.5">
                              {formatDistanceToNowStrict(new Date(a.created_at), { addSuffix: true })}
                            </div>
                          </div>
                          {a.storage_path ? (
                            <span className="shrink-0 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-text-muted)]">
                              storage
                            </span>
                          ) : null}
                        </div>
                        {a.content ? (
                          <pre className="mt-2 max-h-40 overflow-auto rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-2 text-[10px] text-[var(--app-text)] whitespace-pre-wrap">
                            {a.content}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

