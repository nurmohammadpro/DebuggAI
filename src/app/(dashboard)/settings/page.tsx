/**
 * Settings Page
 *
 * User settings with account management, plan display, and navigation to other settings pages.
 */

'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, User as UserIcon, CreditCard, Settings as SettingsIcon, Receipt } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, credits, isAuthenticated } = useSessionStore();

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  const settingsSections = [
    {
      title: 'Account',
      description: 'Manage your account settings',
      icon: UserIcon,
      items: [
        { label: 'Profile Information', href: '/settings/profile' },
        { label: 'Change Password', href: '/settings/password' },
      ],
    },
    {
      title: 'Billing',
      description: 'Manage your subscription and credits',
      icon: CreditCard,
      items: [
        { label: 'Subscription', href: '/pricing' },
        { label: 'Transaction History', href: '/settings/transactions' },
        { label: 'Referral Program', href: '/referrals' },
      ],
    },
    {
      title: 'Developer',
      description: 'Developer tools and integrations',
      icon: SettingsIcon,
      items: [
        { label: 'API Keys', href: '/settings/api-keys' },
        { label: 'Webhooks', href: '/settings/webhooks' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-14 flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Current Plan Card */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold capitalize">{user?.plan}</h3>
                  <Badge variant={user?.plan === 'free' ? 'secondary' : 'default'}>
                    Active
                  </Badge>
                </div>
                <p className="text-muted-foreground">
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
                  <div className="p-2 bg-muted rounded-lg">
                    <section.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start hover:bg-muted"
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
        <Card className="mt-8 border-destructive/50">
          <div className="p-6">
            <h3 className="font-semibold text-destructive mb-2">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Irreversible actions that affect your account
            </p>
            <div className="flex gap-4">
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
