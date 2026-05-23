'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Bug, Check, Copy, FileCode2, History, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';
import { cn } from '@/lib/utils';

type Section = 'summary' | 'root-cause' | 'fix' | 'tests';

export default function DebuggerConceptDemo() {
  const [active, setActive] = useState<Section>('summary');
  const [running, setRunning] = useState(false);

  const sections = useMemo(
    () => [
      { id: 'summary' as const, label: 'Summary' },
      { id: 'root-cause' as const, label: 'Root Cause' },
      { id: 'fix' as const, label: 'Fix' },
      { id: 'tests' as const, label: 'Tests' },
    ],
    [],
  );

  const run = async () => {
    if (running) return;
    setRunning(true);
    await new Promise((r) => setTimeout(r, 800));
    setRunning(false);
  };

  return (
    <PublicLayout>
      <main className="container mx-auto px-4 pt-12 pb-24">
        <div className="mb-6">
          <Link href="/demo/ui" className="inline-flex items-center gap-2 text-[12px] text-[var(--app-text-muted)] hover:text-[var(--app-text)]">
            <ArrowLeft className="h-4 w-4" />
            Back to UI demos
          </Link>
        </div>

        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.1fr,0.9fr] gap-4 items-start">
          {/* Left: Input */}
          <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
            <div className="h-11 px-4 flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-panel)]">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-[6px] bg-[var(--app-accent-soft)] border border-[var(--app-border)] flex items-center justify-center">
                  <Bug className="h-4 w-4 text-[var(--app-accent)]" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-[var(--app-text)]">Debugger</div>
                  <div className="text-[11px] text-[var(--app-text-dim)]">Concept: clearer flow + structured output</div>
                </div>
              </div>
              <button className="h-8 px-3 rounded-[6px] border border-[var(--app-border)] text-[12px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors inline-flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
                    Language
                  </div>
                  <div className="h-9 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 inline-flex items-center text-[13px] text-[var(--app-text)] w-full">
                    TypeScript (auto)
                  </div>
                </label>
                <label className="block">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
                    Context
                  </div>
                  <div className="h-9 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 inline-flex items-center text-[13px] text-[var(--app-text)] w-full">
                    Web app · Next.js
                  </div>
                </label>
              </div>

              <label className="block">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
                  Error / stack trace
                </div>
                <textarea
                  className="w-full min-h-[110px] resize-y rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 font-mono"
                  defaultValue={'TypeError: Cannot read properties of undefined (reading \"map\")\n  at Dashboard (app/dashboard/page.tsx:42:19)\n  at renderWithHooks (...)'}
                />
              </label>

              <label className="block">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
                  Relevant code
                </div>
                <textarea
                  className="w-full min-h-[180px] resize-y rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20 font-mono"
                  defaultValue={'export function Dashboard({ projects }) {\n  return (\n    <ul>\n      {projects.map((p) => (\n        <li key={p.id}>{p.name}</li>\n      ))}\n    </ul>\n  )\n}\n'}
                />
              </label>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <button
                  onClick={() => void run()}
                  className="h-9 px-4 rounded-[6px] bg-[var(--app-accent)] text-[#071006] text-[13px] font-medium hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
                >
                  {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {running ? 'Analyzing…' : 'Analyze'}
                </button>
                <button className="h-9 px-4 rounded-[6px] border border-[var(--app-border)] text-[13px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors inline-flex items-center justify-center gap-2">
                  <Wand2 className="h-4 w-4" />
                  Ask follow-up
                </button>
                <div className="sm:ml-auto text-[12px] text-[var(--app-text-dim)]">
                  Credits: <span className="text-[var(--app-text)] font-semibold">1</span> per analysis
                </div>
              </div>
            </div>
          </div>

          {/* Right: Output */}
          <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
            <div className="h-11 px-2 border-b border-[var(--app-border)] flex items-center gap-1 bg-[var(--app-panel)]">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActive(s.id)}
                  className={cn(
                    'h-8 px-2.5 rounded-[6px] text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors',
                    active === s.id
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)]'
                      : 'text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]',
                  )}
                >
                  {s.label}
                </button>
              ))}
              <button className="ml-auto h-8 px-2.5 rounded-[6px] border border-[var(--app-border)] text-[11px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors inline-flex items-center gap-2">
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            </div>

            <div className="p-4">
              {active === 'summary' && (
                <div className="space-y-3">
                  <Pill tone="bad" icon={<Bug className="h-4 w-4" />} title="Likely cause" body="`projects` is undefined on the first render (or the prop is not passed), so `.map` throws." />
                  <Pill tone="ok" icon={<Check className="h-4 w-4" />} title="Best fix" body="Guard with a default array or render empty state until data is available." />
                  <Pill tone="neutral" icon={<FileCode2 className="h-4 w-4" />} title="Improve UX" body="Show a skeleton while loading and a clear empty state when there are no projects." />
                </div>
              )}

              {active === 'root-cause' && (
                <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-3 text-[13px] text-[var(--app-text)] leading-relaxed">
                  In React, props can be `undefined` if the parent doesn’t pass them, or if you destructure incorrectly. In data-fetching flows, the first render often has “no data yet”. Treat arrays as optional and normalize them:
                  <pre className="mt-3 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3 text-[12px] font-mono whitespace-pre-wrap">
{`const items = Array.isArray(projects) ? projects : [];
return items.map(...);`}
                  </pre>
                </div>
              )}

              {active === 'fix' && (
                <div className="space-y-3">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    Suggested patch
                  </div>
                  <pre className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-3 text-[12px] font-mono whitespace-pre-wrap text-[var(--app-text)]">
{`export function Dashboard({ projects }: { projects?: Array<{id:string; name:string}> }) {
  const list = Array.isArray(projects) ? projects : [];
  if (list.length === 0) return <EmptyState />;
  return (
    <ul>
      {list.map((p) => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}`}
                  </pre>
                  <div className="flex items-center gap-2">
                    <button className="h-9 px-4 rounded-[6px] bg-[var(--ds-green)] text-[#071006] hover:bg-[var(--ds-green-bright)] transition-colors text-[13px] font-medium inline-flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Apply patch
                    </button>
                    <button className="h-9 px-4 rounded-[6px] border border-[var(--app-border)] text-[13px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors">
                      Open in workspace
                    </button>
                  </div>
                </div>
              )}

              {active === 'tests' && (
                <div className="space-y-3">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    Tests to add
                  </div>
                  <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-3 text-[13px] text-[var(--app-text)] leading-relaxed">
                    Add a test for the empty/undefined case so this never regresses.
                    <pre className="mt-3 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3 text-[12px] font-mono whitespace-pre-wrap">
{`it('renders empty state when projects is undefined', () => {
  render(<Dashboard projects={undefined} />);
  expect(screen.getByText(/no projects/i)).toBeInTheDocument();
});`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </PublicLayout>
  );
}

function Pill({
  tone,
  icon,
  title,
  body,
}: {
  tone: 'ok' | 'bad' | 'neutral';
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  const cls =
    tone === 'ok'
      ? 'bg-[var(--app-success-soft)] text-[var(--app-success)] border-[var(--app-success)]/20'
      : tone === 'bad'
        ? 'bg-[var(--app-danger-soft)] text-[var(--app-danger)] border-[var(--app-danger)]/20'
        : 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border-[var(--app-border)]';

  return (
    <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-3">
      <div className="flex items-start gap-2">
        <span className={cn('inline-flex items-center justify-center h-8 w-8 rounded-[6px] border', cls)}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[12px] font-semibold text-[var(--app-text)]">{title}</div>
          <div className="text-[12px] text-[var(--app-text-muted)] mt-0.5">{body}</div>
        </div>
      </div>
    </div>
  );
}

