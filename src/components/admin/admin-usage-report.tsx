'use client';

import { useState, useEffect } from 'react';
import { Coins, TrendingUp, Cpu, Loader2, DollarSign } from 'lucide-react';

interface ModelAgg {
  model: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  credits: number;
  calls: number;
}

interface DailyEntry {
  date: string;
  credits: number;
  cost: number;
}

interface UsageData {
  summary: {
    totalCredits: number;
    totalCost: number;
    models: ModelAgg[];
  };
  daily: DailyEntry[];
  rows: Array<{
    user_id: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    cost_usd: number;
    credits_charged: number;
    created_at: string;
  }>;
}

export function AdminUsageReport() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchUsage();
  }, [days]);

  const fetchUsage = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/usage?days=${days}`);
      if (!res.ok) throw new Error('Failed to fetch usage data');
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load usage report');
    } finally {
      setLoading(false);
    }
  };

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  const formatCost = (c: number) => `$${c.toFixed(4)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--app-text-dim)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-[6px] border border-[var(--app-danger)]/30 bg-[var(--app-danger)]/5">
        <p className="text-[13px] text-[var(--app-danger)]">{error}</p>
        <button onClick={fetchUsage} className="mt-2 text-[13px] text-[var(--app-accent)] hover:underline">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const maxDailyCredits = Math.max(1, ...data.daily.map((d) => d.credits));

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium text-[var(--app-text)] flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-[var(--app-accent)]" />
          AI Usage &amp; Cost Report
        </h2>
        <div className="flex gap-0.5 rounded-[6px] bg-[var(--app-surface)] p-0.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-[6px] px-3 py-1 text-[11px] font-medium transition-colors ${
                days === d
                  ? 'bg-[var(--app-panel)] text-[var(--app-text)]'
                  : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]">
          <Coins className="h-4 w-4 text-[var(--app-warning)] mb-2" />
          <div className="text-[16px] font-semibold text-[var(--app-text)]">{data.summary.totalCredits.toLocaleString()}</div>
          <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">Credits Spent</div>
        </div>
        <div className="p-4 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]">
          <DollarSign className="h-4 w-4 text-[var(--app-success)] mb-2" />
          <div className="text-[16px] font-semibold text-[var(--app-text)]">${data.summary.totalCost.toFixed(2)}</div>
          <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">Total Cost</div>
        </div>
        <div className="p-4 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]">
          <Cpu className="h-4 w-4 text-[var(--app-info)] mb-2" />
          <div className="text-[16px] font-semibold text-[var(--app-text)]">{data.summary.models.length}</div>
          <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">AI Models Used</div>
        </div>
        <div className="p-4 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)]">
          <TrendingUp className="h-4 w-4 text-[var(--app-purple)] mb-2" />
          <div className="text-[16px] font-semibold text-[var(--app-text)]">{data.rows.length}</div>
          <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">Requests ({days}d)</div>
        </div>
      </div>

      {/* Model breakdown */}
      {data.summary.models.length > 0 && (
        <div>
          <h3 className="text-[13px] font-medium text-[var(--app-text)] mb-3">Model Breakdown</h3>
          <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[var(--app-border)]">
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Model</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] text-right">Calls</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] text-right">Tokens In</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] text-right">Tokens Out</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] text-right">Credits</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.summary.models.map((m) => (
                    <tr key={m.model} className="border-b border-[var(--app-border)]/50 last:border-0">
                      <td className="px-4 py-2 text-[13px] font-medium text-[var(--app-text)] font-mono">{m.model}</td>
                      <td className="px-4 py-2 text-[13px] text-[var(--app-text)] text-right">{m.calls}</td>
                      <td className="px-4 py-2 text-[13px] text-[var(--app-text)] text-right">{formatTokens(m.tokensIn)}</td>
                      <td className="px-4 py-2 text-[13px] text-[var(--app-text)] text-right">{formatTokens(m.tokensOut)}</td>
                      <td className="px-4 py-2 text-[13px] text-[var(--app-text)] text-right">{m.credits}</td>
                      <td className="px-4 py-2 text-[13px] text-[var(--app-text)] text-right font-mono">{formatCost(m.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Daily chart */}
      {data.daily.length > 0 && (
        <div>
          <h3 className="text-[13px] font-medium text-[var(--app-text)] mb-3">Daily Credit Consumption</h3>
          <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4">
            <div className="h-32 flex items-end gap-px">
              {data.daily.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 bg-[var(--app-accent)]/60 hover:bg-[var(--app-accent)] transition-colors rounded-t relative group min-w-[3px]"
                  style={{ height: `${Math.max(3, (d.credits / maxDailyCredits) * 100)}%` }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[var(--app-panel-2)] text-[var(--app-text)] text-[10px] px-2 py-1 rounded-[6px] whitespace-nowrap border border-[var(--app-border)] shadow-lg z-10">
                    <div className="font-medium">{d.date}</div>
                    <div>{d.credits} credits</div>
                    <div>${d.cost.toFixed(4)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-[var(--app-text-dim)]">
              <span>{data.daily[0]?.date}</span>
              <span>{data.daily[data.daily.length - 1]?.date}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent ledger rows */}
      {data.rows.length > 0 && (
        <div>
          <h3 className="text-[13px] font-medium text-[var(--app-text)] mb-3">Recent Requests</h3>
          <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
            <div className="overflow-x-auto max-h-64 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-[var(--app-panel)]">
                  <tr className="border-b border-[var(--app-border)]">
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Time</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">User</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Model</th>
                    <th className="px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] text-right">Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--app-border)]/50 last:border-0">
                      <td className="px-4 py-2 text-[11px] text-[var(--app-text-dim)] font-mono">
                        {new Date(row.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-[13px] text-[var(--app-text)] font-mono text-[11px]">
                        {row.user_id?.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-2 text-[13px] text-[var(--app-text)]">{row.model}</td>
                      <td className="px-4 py-2 text-[13px] text-[var(--app-text)] text-right">{row.credits_charged}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
