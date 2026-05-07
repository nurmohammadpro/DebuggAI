'use client';

import Link from 'next/link';
import { BookOpen, Wrench, Bug, Wand2, CreditCard, Shield } from 'lucide-react';

import { Card } from '@/components/ui/card';

const sections = [
  {
    title: 'Getting Started',
    description: 'Sign up, confirm email, and open your first workspace.',
    icon: BookOpen,
    links: [
      { label: 'Create an account', href: '/signup' },
      { label: 'Sign in', href: '/login' },
      { label: 'Go to Dashboard', href: '/dashboard' },
    ],
  },
  {
    title: 'Debug Mode',
    description: 'Paste errors, attach logs, and keep a history of sessions.',
    icon: Bug,
    links: [
      { label: 'Debug workspace', href: '/dashboard/debug' },
      { label: 'Debug history', href: '/dashboard/debug/history' },
    ],
  },
  {
    title: 'Builder Mode',
    description: 'Generate and iterate on projects with templates and preview.',
    icon: Wand2,
    links: [
      { label: 'Projects', href: '/dashboard/home' },
      { label: 'Web Builder', href: '/dashboard/web-builder' },
    ],
  },
  {
    title: 'Billing & Credits',
    description: 'Plans, credits, and transactions.',
    icon: CreditCard,
    links: [
      { label: 'Pricing', href: '/dashboard/pricing' },
      { label: 'Transactions', href: '/dashboard/settings/transactions' },
      { label: 'Referrals', href: '/dashboard/referrals' },
    ],
  },
  {
    title: 'Integrations (v1)',
    description: 'Connect services at the project level.',
    icon: Wrench,
    links: [{ label: 'Project settings', href: '/dashboard/home' }],
  },
  {
    title: 'Security',
    description: 'Admin and access control are enforced server-side.',
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
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Documentation
            </h1>
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">
            Product guides and quick links. Full docs site coming soon.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {sections.map((s) => (
            <Card key={s.title} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-[8px] bg-muted/40 border border-border/40">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold">{s.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {s.description}
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {s.links.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        className="text-sm text-primary hover:underline"
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

