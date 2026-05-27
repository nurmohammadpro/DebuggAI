'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Bell, Bug, Clock, CreditCard, FolderKanban, LayoutGrid, Plus, Search, Sparkles, Zap } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';
import { cn } from '@/lib/utils';

export default function DashboardConceptDemo() {
  return (
    <PublicLayout>
      <main className="container mx-auto px-4 pt-12 pb-24">
        <div className="mb-6">
          <Link href="/demo/ui" className="inline-flex items-center gap-2 text-[12px] text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
            <ArrowLeft className="h-4 w-4" />
            Back to UI demos
          </Link>
        </div>

        <div className="max-w-6xl mx-auto rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
          {/* Header */}
          <div className="h-12 px-4 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center gap-3">
            <div className="h-8 w-8 rounded-[6px] bg-[var(--app-accent-soft)] border border-[var(--app-border)] flex items-center justify-center">
              <LayoutGrid className="h-4 w-4 text-[var(--app-accent)]" />
            </div>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[var(--app-text)]">Client Dashboard</div>
              <div className="text-[11px] text-[var(--app-text-dim)] truncate">Concept: calmer hierarchy + faster scanning</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)]">
                <Zap className="h-3.5 w-3.5 text-[var(--ds-green)]" />
                <span className="font-semibold text-[var(--app-text)]">2,412</span>
                <span className="text-[var(--app-text-muted)]">credits</span>
              </div>
              <button className="h-8 w-8 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)] transition-colors inline-flex items-center justify-center">
                <Bell className="h-4 w-4" />
              </button>
              <button className="h-8 px-3 rounded-[6px] bg-[var(--ds-green)] text-white hover:bg-[var(--ds-green-bright)] transition-colors inline-flex items-center gap-2 text-[12px] font-medium">
                <Plus className="h-4 w-4" />
                New project
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="grid lg:grid-cols-[1fr,320px] gap-4 p-4 bg-[var(--app-bg)]">
            {/* Left */}
            <div className="space-y-4">
              <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 flex-1 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 inline-flex items-center gap-2 text-[13px] text-[var(--app-text-dim)]">
                    <Search className="h-4 w-4" />
                    Search projects, threads, runs…
                  </div>
                  <button className="h-9 px-3 rounded-[6px] border border-[var(--app-border)] text-[12px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors inline-flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Suggestions
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <StatCard icon={FolderKanban} label="Projects" value="12" sub="3 updated today" />
                <StatCard icon={Bug} label="Debug sessions" value="31" sub="Last: 12m ago" />
                <StatCard icon={Clock} label="Runs" value="7" sub="2 running" />
              </div>

              <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
                <div className="h-10 px-3 border-b border-[var(--app-border)] flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Recent projects</div>
                  <button className="h-7 px-2 rounded-[6px] border border-[var(--app-border)] text-[11px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors inline-flex items-center gap-2">
                    View all
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="divide-y divide-[var(--app-border)]">
                  {[
                    { name: 'Landing Page Generator', stack: 'Next.js', ts: '2m' },
                    { name: 'Auth + Billing Setup', stack: 'Supabase', ts: '1h' },
                    { name: 'Security Audit Report', stack: 'PDF export', ts: '3d' },
                  ].map((p, i) => (
                    <button
                      key={p.name}
                      className={cn(
                        'w-full text-left px-3 py-3 hover:bg-[var(--app-panel-2)] transition-colors',
                        i === 0 ? 'bg-[var(--app-accent-soft)]/40' : 'bg-[var(--app-panel)]',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center">
                          <FolderKanban className="h-4 w-4 text-[var(--app-text-muted)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-[var(--app-text)] truncate">{p.name}</div>
                          <div className="text-[11px] text-[var(--app-text-dim)] truncate">{p.stack}</div>
                        </div>
                        <div className="text-[11px] text-[var(--app-text-dim)]">{p.ts} ago</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right rail */}
            <div className="space-y-4">
              <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                  Quick actions
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <ActionButton icon={Bug} label="New debug" />
                  <ActionButton icon={LayoutGrid} label="Open workspace" />
                  <ActionButton icon={CreditCard} label="Top up credits" />
                  <ActionButton icon={Sparkles} label="Full scan" />
                </div>
              </div>

              <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
                <div className="h-10 px-3 border-b border-[var(--app-border)] flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Activity</div>
                </div>
                <div className="p-3 space-y-2">
                  {[
                    { t: 'Run succeeded', d: 'Contrast sweep (public pages)', tone: 'ok' as const },
                    { t: 'Run queued', d: 'Repo analysis: /frontend', tone: 'wait' as const },
                    { t: 'Credits used', d: 'Web Builder export', tone: 'neutral' as const },
                  ].map((a) => (
                    <div key={a.t} className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', a.tone === 'ok' ? 'bg-[var(--app-success)]' : a.tone === 'wait' ? 'bg-[var(--app-warning)]' : 'bg-[var(--app-text-dim)]')} />
                        <div className="text-[12px] font-medium text-[var(--app-text)]">{a.t}</div>
                        <div className="ml-auto text-[11px] text-[var(--app-text-dim)]">now</div>
                      </div>
                      <div className="text-[12px] text-[var(--app-text-muted)] mt-1">{a.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center">
          <Icon className="h-4 w-4 text-[var(--app-text-muted)]" />
        </div>
        <div className="text-[18px] font-semibold text-[var(--app-text)]">{value}</div>
      </div>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{label}</div>
      <div className="text-[12px] text-[var(--app-text-muted)] mt-0.5">{sub}</div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] hover:bg-[var(--app-surface)] transition-colors p-3 text-left">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--app-text-muted)]" />
        <div className="text-[12px] font-medium text-[var(--app-text)]">{label}</div>
      </div>
    </button>
  );
}

