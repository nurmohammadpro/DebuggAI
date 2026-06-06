'use client';

import Link from 'next/link';
import { BookOpen, Wrench, Bug, Wand2, CreditCard, Shield } from 'lucide-react';

import { Card } from '@/components/ui/card';

const sections = [
  {
    title: 'Getting Started',
    description: 'Create an account, confirm email, and open your first project workspace.',
    icon: BookOpen,
    links: [
      { label: 'Create an account', href: '/signup' },
      { label: 'Sign in', href: '/login' },
      { label: 'Go to Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Debug Mode',
    description: 'Paste errors, attach logs, and keep session context tied to your account.',
    icon: Bug,
    links: [
      { label: 'Debug workspace', href: '/dashboard/debug' },
      { label: 'Debug history', href: '/dashboard/debug/history' },
    ],
  },
  {
    title: 'Builder Mode',
    description: 'Generate project files, inspect changes, and run preview when the app is ready.',
    icon: Wand2,
    links: [
      { label: 'Projects', href: '/dashboard/home' },
      { label: 'Web Builder', href: '/dashboard/web-builder' },
    ],
  },
  {
    title: 'Billing & Credits',
    description: 'Review plans, credits, transactions, and referral activity.',
    icon: CreditCard,
    links: [
      { label: 'Pricing', href: '/dashboard/pricing' },
      { label: 'Transactions', href: '/dashboard/settings/transactions' },
      { label: 'Referrals', href: '/dashboard/referrals' },
    ],
  },
  {
    title: 'Project Settings',
    description: 'Manage project-level configuration as new integrations are added.',
    icon: Wrench,
    links: [{ label: 'Project settings', href: '/dashboard/home' }],
  },
  {
    title: 'Security',
    description: 'Review account policies, legal terms, and server-side access controls.',
    icon: Shield,
    links: [
      { label: 'Privacy', href: '/privacy' },
      { label: 'Terms', href: '/terms' },
    ],
  },
] as const;

export function DocsPage() {
  return (
    <div className="p-6 sm:p-10">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="h-5 w-5 text-[var(--app-accent)]" />
            <h1 className="text-[28px] font-semibold tracking-tight text-[var(--app-text)]">
              Documentation
            </h1>
          </div>
          <p className="text-[13px] text-[var(--app-text-muted)]">
            Practical links for the current product. Deeper implementation guides are coming soon.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {sections.map((s) => (
            <Card key={s.title} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)]">
                  <s.icon className="h-5 w-5 text-[var(--app-accent)]" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[var(--app-text)]">{s.title}</div>
                  <div className="text-[13px] text-[var(--app-text-muted)] mt-1">
                    {s.description}
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {s.links.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="text-[13px] text-[var(--app-accent)] hover:text-[var(--app-text)] transition-colors"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
