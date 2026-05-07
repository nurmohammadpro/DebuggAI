'use client';

import { CreditCard } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, isAuthenticated } = useSessionStore();
  const credits = user?.credits;

  if (!isAuthenticated) {
    return null;
  }

  const settingsSections = [
    {
      title: 'Billing',
      description: 'Manage your subscription and credits',
      icon: CreditCard,
      items: [
        { label: 'Subscription', href: '/dashboard/pricing' },
        { label: 'Transaction History', href: '/dashboard/settings/transactions' },
        { label: 'Referral Program', href: '/dashboard/referrals' },
      ],
    },
  ];

  return (
    <div className="p-6 sm:p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">Settings</h1>
        <p className="text-[13px] text-[var(--app-text-muted)] mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Current Plan Card */}
      <div className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl p-5 mb-6">
        <h2 className="text-[16px] font-medium text-[var(--app-text)] mb-4">Current Plan</h2>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-semibold text-[var(--app-accent)] capitalize">{user?.plan || 'free'}</span>
              <span className="inline-flex rounded-[6px] bg-[var(--app-success-soft)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-success)]">
                Active
              </span>
            </div>
            <p className="text-[13px] text-[var(--app-text-muted)]">
              {credits === -1 ? 'Unlimited' : `${credits} credits`} remaining
            </p>
          </div>
          <Link href="/dashboard/pricing">
            <button className="inline-flex items-center rounded-[8px] bg-[var(--app-accent)] px-4 py-2 text-[13px] font-medium text-black transition-colors hover:opacity-90 w-full sm:w-auto">
              Upgrade Plan
            </button>
          </Link>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid gap-4">
        {settingsSections.map((section) => (
          <div key={section.title} className="rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 rounded-[8px] bg-[var(--app-surface)]">
                <section.icon className="h-5 w-5 text-[var(--app-accent)]" />
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-[var(--app-text)]">{section.title}</h3>
                <p className="text-[13px] text-[var(--app-text-muted)]">{section.description}</p>
              </div>
            </div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link key={item.href} href={item.href}>
                  <button className="w-full text-left rounded-[8px] px-3 py-2.5 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]">
                    {item.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="mt-6 rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl p-5 border border-[var(--app-danger)]/15">
        <h3 className="text-[16px] font-medium text-[var(--app-danger)] mb-2">Danger Zone</h3>
        <p className="text-[13px] text-[var(--app-text-muted)] mb-4">
          Irreversible actions that affect your account
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="inline-flex items-center rounded-[8px] bg-[var(--app-danger)] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:opacity-90 w-full sm:w-auto">
            Delete Account
          </button>
          <button className="inline-flex items-center rounded-[8px] border border-[var(--app-border)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] w-full sm:w-auto">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}
