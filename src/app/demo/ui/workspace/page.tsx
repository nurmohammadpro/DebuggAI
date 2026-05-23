'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Bolt, CheckCircle2, Code2, Eye, FileText, GitBranch, ListChecks, Play, Search, Settings2, Terminal, Zap } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';
import { cn } from '@/lib/utils';

type Stage = 'seed' | 'sprout' | 'sapling' | 'tree';

function stageMeta(stage: Stage) {
  switch (stage) {
    case 'seed':
      return { label: 'Seed', desc: 'Understanding the objective', tone: 'bg-[var(--app-info-soft)] text-[var(--app-info)] border-[var(--app-info)]/20' };
    case 'sprout':
      return { label: 'Sprout', desc: 'Planning + selecting tools', tone: 'bg-[var(--app-warning-soft)] text-[var(--app-warning)] border-[var(--app-warning)]/20' };
    case 'sapling':
      return { label: 'Sapling', desc: 'Editing + validating', tone: 'bg-[var(--app-accent-soft)] text-[var(--app-accent)] border-[var(--app-accent)]/20' };
    case 'tree':
      return { label: 'Tree', desc: 'Ready to run + export', tone: 'bg-[var(--app-success-soft)] text-[var(--app-success)] border-[var(--app-success)]/20' };
  }
}

export default function WorkspaceConceptDemo() {
  const [activeTool, setActiveTool] = useState<'code' | 'preview' | 'files' | 'console' | 'runs' | 'git' | 'env'>('code');
  const [stage, setStage] = useState<Stage>('sapling');
  const meta = stageMeta(stage);

  const tabs = useMemo(
    () => [
      { id: 'code' as const, label: 'Code', icon: Code2 },
      { id: 'preview' as const, label: 'Preview', icon: Eye },
      { id: 'files' as const, label: 'Files', icon: FileText },
      { id: 'console' as const, label: 'Console', icon: Terminal },
      { id: 'runs' as const, label: 'Runs', icon: ListChecks },
      { id: 'git' as const, label: 'Git', icon: GitBranch },
      { id: 'env' as const, label: 'Env', icon: Settings2 },
    ],
    [],
  );

  return (
    <PublicLayout>
      <main className="h-[calc(100vh-56px)]">
        <div className="h-full flex flex-col">
          <div className="container mx-auto px-4 pt-6 pb-3">
            <Link href="/demo/ui" className="inline-flex items-center gap-2 text-[12px] text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
              <ArrowLeft className="h-4 w-4" />
              Back to UI demos
            </Link>
          </div>

          <div className="flex-1 min-h-0">
            <div className="mx-auto max-w-[1200px] h-full border-y border-[var(--app-border)] bg-[var(--app-bg)]">
              {/* Header */}
              <div className="h-12 px-4 flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-panel)]">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-[6px] bg-[var(--app-accent-soft)] border border-[var(--app-border)] flex items-center justify-center">
                    <Bolt className="h-4 w-4 text-[var(--app-accent)]" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--app-text)] truncate">
                      Landing Page Generator
                    </div>
                    <div className="text-[11px] text-[var(--app-text-dim)] truncate">
                      project_2a9c1 · thread_91d
                    </div>
                  </div>
                  <span className={cn('hidden sm:inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]', meta.tone)}>
                    {meta.label}
                  </span>
                  <span className="hidden md:inline text-[11px] text-[var(--app-text-dim)] truncate">
                    {meta.desc}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)]">
                    <Zap className="h-3.5 w-3.5 text-[var(--ds-green)]" />
                    <span className="font-semibold text-[var(--app-text)]">2,412</span>
                    <span className="text-[var(--app-text-muted)]">credits</span>
                  </div>

                  <button className="h-8 px-3 rounded-[6px] border border-[var(--app-border)] hover:bg-[var(--app-surface)] text-[11px] font-semibold uppercase tracking-tight text-[var(--app-text-muted)] hover:text-[var(--app-text)] transition-colors">
                    Share
                  </button>
                  <button className="h-8 px-3 rounded-[6px] bg-[var(--ds-green)] text-[#071006] hover:bg-[var(--ds-green-bright)] transition inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tight">
                    <Play className="h-3.5 w-3.5" />
                    Run
                  </button>
                </div>
              </div>

              {/* 3-panel layout */}
              <div className="h-[calc(100%-48px)] flex min-h-0">
                {/* Left sidebar */}
                <aside className="hidden md:flex w-[272px] shrink-0 border-r border-[var(--app-border)] bg-[var(--app-panel)] flex-col">
                  <div className="h-11 px-3 flex items-center gap-2 border-b border-[var(--app-border)]">
                    <div className="h-8 flex-1 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-2 inline-flex items-center gap-2">
                      <Search className="h-4 w-4 text-[var(--app-text-dim)]" />
                      <span className="text-[12px] text-[var(--app-text-dim)]">Search projects & chats</span>
                    </div>
                  </div>

                  <div className="p-3 space-y-4 overflow-auto">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-2">
                        Projects
                      </div>
                      <div className="space-y-1">
                        {['Landing Page Generator', 'Auth + Billing Setup', 'SaaS Dashboard UI'].map((p, i) => (
                          <button
                            key={p}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-[6px] border transition-colors',
                              i === 0
                                ? 'border-[var(--app-accent)]/25 bg-[var(--app-accent-soft)] text-[var(--app-accent)]'
                                : 'border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)] hover:bg-[var(--app-panel-2)]',
                            )}
                          >
                            <div className="text-[12px] font-medium truncate">{p}</div>
                            <div className="text-[11px] text-[var(--app-text-dim)] truncate">
                              Updated {i === 0 ? '2m' : i === 1 ? '1h' : '3d'} ago
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-2">
                        Chats
                      </div>
                      <div className="space-y-1">
                        {[
                          { t: 'Homepage hero disappeared', s: 'succeeded' },
                          { t: 'Fix contrast in web builder', s: 'running' },
                          { t: 'Improve pricing copy', s: 'queued' },
                        ].map((c, i) => (
                          <button
                            key={c.t}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] hover:bg-[var(--app-panel-2)] transition-colors',
                              i === 0 ? 'ring-1 ring-[var(--app-accent)]/15' : '',
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full',
                                  c.s === 'succeeded'
                                    ? 'bg-[var(--app-success)]'
                                    : c.s === 'running'
                                      ? 'bg-[var(--app-info)]'
                                      : 'bg-[var(--app-warning)]',
                                )}
                              />
                              <div className="text-[12px] font-medium text-[var(--app-text)] truncate">{c.t}</div>
                            </div>
                            <div className="text-[11px] text-[var(--app-text-dim)] truncate">3 messages · {c.s}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>

                {/* Center chat */}
                <section className="flex-1 min-w-0 flex flex-col">
                  <div className="h-11 px-4 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text)]">
                        Assistant
                      </div>
                      <div className="text-[11px] text-[var(--app-text-dim)] truncate">
                        Keep a narrative: plan, edits, verification, export.
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <button
                        onClick={() => setStage((s) => (s === 'seed' ? 'sprout' : s === 'sprout' ? 'sapling' : s === 'sapling' ? 'tree' : 'seed'))}
                        className="h-7 px-2 rounded-[6px] border border-[var(--app-border)] text-[11px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                      >
                        Advance stage
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-auto p-4 space-y-3">
                    <Message role="user" text="Build a clean hero section with a strong CTA and a live preview." />
                    <Message
                      role="assistant"
                      text="Got it. I’ll do this in stages: (1) align tokens & layout grid, (2) implement hero + CTA, (3) verify in light/dark, (4) run build + snapshot."
                      stage={stage}
                    />
                    <ProgressCard stage={stage} />
                    <Message role="assistant" text="I’ve updated the hero copy and restored the missing content. Next: tighten contrast for badges and keycaps." />
                  </div>

                  <div className="border-t border-[var(--app-border)] bg-[var(--app-panel)] p-3">
                    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2">
                      <div className="text-[12px] text-[var(--app-text-dim)]">Describe a change…</div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button className="h-8 px-3 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[12px] font-medium hover:opacity-90 transition-opacity">
                        Send
                      </button>
                      <button className="h-8 px-3 rounded-[6px] border border-[var(--app-border)] text-[12px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors">
                        Attach
                      </button>
                      <span className="ml-auto text-[11px] text-[var(--app-text-dim)]">⌘⏎ to send</span>
                    </div>
                  </div>
                </section>

                {/* Right tools */}
                <aside className="hidden lg:flex w-[420px] shrink-0 border-l border-[var(--app-border)] bg-[var(--app-panel)] flex-col">
                  <div className="h-11 px-2 border-b border-[var(--app-border)] flex items-center gap-1">
                    {tabs.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setActiveTool(t.id)}
                        className={cn(
                          'h-8 px-2.5 rounded-[6px] text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors',
                          activeTool === t.id
                            ? 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)]'
                            : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)]',
                        )}
                      >
                        <t.icon className="h-3.5 w-3.5" />
                        <span className="hidden xl:inline">{t.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 min-h-0 overflow-auto p-3">
                    {activeTool === 'code' && <CodeMock />}
                    {activeTool === 'preview' && <PreviewMock />}
                    {activeTool === 'files' && <FilesMock />}
                    {activeTool === 'console' && <ConsoleMock />}
                    {activeTool === 'runs' && <RunsMock />}
                    {activeTool === 'git' && <GitMock />}
                    {activeTool === 'env' && <EnvMock />}
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}

function Message({ role, text, stage }: { role: 'user' | 'assistant'; text: string; stage?: Stage }) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[520px] rounded-[6px] border px-3 py-2 text-[13px] leading-relaxed',
          isUser
            ? 'bg-[var(--app-surface)] border-[var(--app-border)] text-[var(--app-text)]'
            : 'bg-[var(--app-panel)] border-[var(--app-border)] text-[var(--app-text)]',
        )}
      >
        {stage && (
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
            Stage: {stageMeta(stage).label}
          </div>
        )}
        {text}
      </div>
    </div>
  );
}

function ProgressCard({ stage }: { stage: Stage }) {
  const steps: Array<{ label: string; done: boolean }> = [
    { label: 'Plan', done: stage !== 'seed' },
    { label: 'Edit', done: stage === 'sapling' || stage === 'tree' },
    { label: 'Verify', done: stage === 'tree' },
    { label: 'Export', done: false },
  ];

  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[12px] font-semibold text-[var(--app-text)]">Progress narrative</div>
        <span className={cn('inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]', stageMeta(stage).tone)}>
          {stageMeta(stage).label}
        </span>
      </div>
      <div className="text-[11px] text-[var(--app-text-dim)] mt-0.5">
        The UI should always answer: “where are we” and “what’s next”.
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center gap-2 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-2 py-1.5">
            <CheckCircle2 className={cn('h-4 w-4', s.done ? 'text-[var(--app-success)]' : 'text-[var(--app-text-dim)]')} />
            <div className="text-[12px] text-[var(--app-text)]">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CodeMock() {
  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] overflow-hidden">
      <div className="h-9 px-3 border-b border-[var(--app-border)] flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">app/page.tsx</div>
        <div className="text-[11px] text-[var(--app-text-dim)]">UTF-8 · TSX</div>
      </div>
      <pre className="p-3 text-[12px] leading-relaxed text-[var(--app-text)] font-mono whitespace-pre-wrap">
{`export default function Home() {
  return (
    <main className="container">
      <h1>Debug & Build Apps with AI</h1>
      <p>Instant debugging and a live web builder.</p>
    </main>
  )
}`}
      </pre>
    </div>
  );
}

function PreviewMock() {
  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Preview</div>
      <div className="mt-2 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-6 text-center">
        <div className="text-[18px] font-semibold text-[var(--app-text)]">Hero preview</div>
        <div className="text-[13px] text-[var(--app-text-muted)] mt-2 max-w-[260px] mx-auto">
          The preview surface should feel trustworthy: clear reload state, error state, and quick open-in-new-tab.
        </div>
        <div className="mt-4 inline-flex gap-2">
          <button className="h-8 px-3 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[12px] font-medium hover:opacity-90 transition-opacity">Primary</button>
          <button className="h-8 px-3 rounded-[6px] border border-[var(--app-border)] text-[12px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors">Secondary</button>
        </div>
      </div>
    </div>
  );
}

function FilesMock() {
  return (
    <div className="space-y-2">
      <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2 text-[12px] text-[var(--app-text)] font-medium">
        File tree
      </div>
      {['app/page.tsx', 'app/layout.tsx', 'components/hero.tsx', 'styles/globals.css'].map((f) => (
        <div key={f} className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2 text-[12px] text-[var(--app-text)]">
          {f}
        </div>
      ))}
    </div>
  );
}

function ConsoleMock() {
  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] overflow-hidden">
      <div className="h-9 px-3 border-b border-[var(--app-border)] flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">Console</div>
        <div className="text-[11px] text-[var(--app-text-dim)]">clear</div>
      </div>
      <div className="p-3 text-[12px] text-[var(--app-text)] font-mono space-y-1">
        <div><span className="text-[var(--app-text-dim)]">[dev]</span> Compiled successfully</div>
        <div><span className="text-[var(--app-warning)]">[warn]</span> Missing alt text on image</div>
        <div><span className="text-[var(--app-danger)]">[error]</span> Failed to fetch /api/foo (500)</div>
      </div>
    </div>
  );
}

function RunsMock() {
  return (
    <div className="space-y-2">
      {[
        { id: 'run_1', status: 'succeeded', objective: 'plan', ts: '2m ago' },
        { id: 'run_2', status: 'running', objective: 'fix contrast', ts: 'just now' },
      ].map((r) => (
        <div key={r.id} className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">{r.status}</span>
            <div className="text-[12px] font-medium text-[var(--app-text)] truncate">{r.objective}</div>
            <div className="ml-auto text-[11px] text-[var(--app-text-dim)]">{r.ts}</div>
          </div>
          <div className="mt-2 text-[11px] text-[var(--app-text-muted)]">
            The real UX improvement: stream step-by-step progress here and let users jump to diff/artifacts.
          </div>
        </div>
      ))}
    </div>
  );
}

function GitMock() {
  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
      <div className="text-[12px] font-semibold text-[var(--app-text)]">Changes</div>
      <div className="mt-2 space-y-1 text-[12px]">
        <div className="flex items-center justify-between rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-2 py-1.5">
          <span className="font-mono text-[var(--app-text)]">app/page.tsx</span>
          <span className="text-[11px] text-[var(--app-warning)]">modified</span>
        </div>
        <div className="flex items-center justify-between rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-2 py-1.5">
          <span className="font-mono text-[var(--app-text)]">components/hero.tsx</span>
          <span className="text-[11px] text-[var(--app-success)]">added</span>
        </div>
      </div>
    </div>
  );
}

function EnvMock() {
  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
      <div className="text-[12px] font-semibold text-[var(--app-text)]">Environment</div>
      <div className="mt-2 space-y-2">
        {[
          { k: 'NEXT_PUBLIC_SITE_URL', v: 'https://debuggai.com' },
          { k: 'SUPABASE_URL', v: 'https://***.supabase.co' },
        ].map((e) => (
          <div key={e.k} className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-2 py-1.5">
            <div className="text-[11px] text-[var(--app-text-dim)] font-mono">{e.k}</div>
            <div className="text-[12px] text-[var(--app-text)] font-mono truncate">{e.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

