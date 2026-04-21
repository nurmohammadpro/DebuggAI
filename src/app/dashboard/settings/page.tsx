/**
 * Settings Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {  User as UserIcon, CreditCard, Settings as SettingsIcon } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, isAuthenticated } = useSessionStore();
  const credits = user?.credits;

  if (!isAuthenticated) {
    return null; // Will redirect
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 h-14 flex items-center gap-2">
          <SettingsIcon className="h-5 w-5" style={{ color: 'var(--ds-green)' }} />
          <h1 className="h2">Settings</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Current Plan Card */}
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="h3 mb-4">Current Plan</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="stat capitalize" style={{ color: 'var(--ds-green)' }}>{user?.plan}</h3>
                  <Badge variant="green" pill>
                    Active
                  </Badge>
                </div>
                <p className="text-text2">
                  {credits === -1 ? 'Unlimited' : `${credits} credits`} remaining
                </p>
              </div>
              <Link href="/pricing">
                <Button>Upgrade Plan</Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Settings Sections */}
        <div className="grid md:grid-cols-1 gap-4">
          {settingsSections.map((section) => (
            <Card key={section.title}>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-ds" style={{ background: 'var(--ds-surface3)' }}>
                    <section.icon className="h-5 w-5" style={{ color: 'var(--ds-green)' }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-text">{section.title}</h3>
                    <p className="text-sm text-text2">{section.description}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                      >
                        {item.label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Danger Zone */}
        <Card className="mt-6 border-red/30" style={{ boxShadow: '0 0 0 1px rgba(255,82,82,0.15)' }}>
          <div className="p-6">
            <h3 className="h3 mb-2" style={{ color: 'var(--ds-red)' }}>Danger Zone</h3>
            <p className="text-sm text-text2 mb-4">
              Irreversible actions that affect your account
            </p>
            <div className="flex gap-3">
              <Button variant="destructive" size="sm">
                Delete Account
              </Button>
              <Button variant="outline" size="sm">
                Export Data
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
