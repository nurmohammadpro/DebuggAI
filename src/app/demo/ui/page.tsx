import Link from 'next/link';
import { LayoutGrid, Bug, PanelsTopLeft } from 'lucide-react';
import { PublicLayout } from '@/components/public-layout';

export default function UiDemosIndexPage() {
  const demos = [
    {
      href: '/demo/ui/dashboard',
      title: 'Client Dashboard Concept',
      desc: 'Projects + activity + quick actions, with a calmer hierarchy.',
      icon: LayoutGrid,
    },
    {
      href: '/demo/ui/debugger',
      title: 'Debugger Concept',
      desc: 'Clearer input affordances, result structure, and “next action” flow.',
      icon: Bug,
    },
    {
      href: '/demo/ui/workspace',
      title: 'Workspace Concept',
      desc: 'Manus/Codex-style 3-panel layout with a progress narrative surface.',
      icon: PanelsTopLeft,
    },
  ];

  return (
    <PublicLayout>
      <main className="container mx-auto px-4 pt-16 pb-24">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="inline-flex rounded-[6px] px-3 py-1 bg-[var(--app-accent-soft)] text-[11px] font-medium text-[var(--app-accent)] mb-4">
            UI Demos
          </div>
          <h1 className="text-[28px] font-semibold tracking-tight text-[var(--app-text)]">
            Dashboard, Debugger, Workspace
          </h1>
          <p className="text-[14px] text-[var(--app-text-muted)] mt-3">
            Concept mockups implemented inside the app (not the production routes).
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-3">
          {demos.map((d) => (
            <Link
              key={d.href}
              href={d.href}
              className="group rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] p-4 hover:bg-[var(--app-panel-2)] transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-[6px] bg-[var(--app-accent-soft)] border border-[var(--app-border)] flex items-center justify-center">
                  <d.icon className="h-4 w-4 text-[var(--app-accent)]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[var(--app-text)] truncate">
                    {d.title}
                  </div>
                  <div className="text-[12px] text-[var(--app-text-muted)] mt-0.5 line-clamp-2">
                    {d.desc}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-accent)] opacity-80 group-hover:opacity-100">
                Open demo
              </div>
            </Link>
          ))}
        </div>
      </main>
    </PublicLayout>
  );
}

