'use client';

import { useRef, useState } from 'react';
import { CreditCard, Shield, User, Camera } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SettingsPage() {
  const { user, isAuthenticated } = useSessionStore();
  const credits = user?.credits;
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isAuthenticated) {
    return null;
  }

  const handleSaveProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ display_name: displayName })
        .eq('id', user?.id);

      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${user?.id}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);

      await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', user?.id);

      toast.success('Avatar updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

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
    {
      title: 'Security',
      description: 'Protect your account with additional security',
      icon: Shield,
      items: [
        { label: 'Two-Factor Authentication', href: '/dashboard/settings/security' },
        { label: 'Danger Zone', href: '/dashboard/settings/danger' },
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

      {/* Profile Section */}
      <section className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-5 mb-6">
        <h2 className="text-[13px] font-medium text-[var(--app-text)] mb-4">Profile</h2>
        <div className="flex items-start gap-4">
          <div className="relative">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-16 h-16 rounded-[6px] bg-[var(--app-surface)] flex items-center justify-center text-[var(--app-text-muted)] overflow-hidden border border-[var(--app-border)] hover:border-[var(--app-accent)] transition-colors"
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8" />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-[6px]">
                <Camera className="h-5 w-5 text-white" />
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div className="flex-1 space-y-3 max-w-sm">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
                Display Name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-9 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 text-[13px] text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-1">
                Email
              </label>
              <input
                value={user?.email || ''}
                disabled
                className="w-full h-9 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] px-3 text-[13px] text-[var(--app-text-muted)] outline-none"
              />
            </div>
            <button
              onClick={handleSaveProfile}
              className="h-8 px-4 rounded-[6px] bg-[var(--app-accent)] text-[var(--app-bg)] text-[11px] font-semibold uppercase tracking-tight hover:opacity-90 transition-opacity"
            >
              Save Profile
            </button>
          </div>
        </div>
      </section>

      {/* Current Plan Card */}
      <div className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-5 mb-6">
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
            <button className="inline-flex items-center rounded-[6px] bg-[var(--app-accent)] px-4 py-2 text-[13px] font-medium text-[var(--app-bg)] transition-colors hover:opacity-90 w-full sm:w-auto">
              Upgrade Plan
            </button>
          </Link>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid gap-4">
        {settingsSections.map((section) => (
          <div key={section.title} className="rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-1.5 rounded-[6px] bg-[var(--app-surface)]">
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
                  <button className="w-full text-left rounded-[6px] px-3 py-2.5 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]">
                    {item.label}
                  </button>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <div className="mt-6 rounded-[6px] bg-[var(--app-panel)] backdrop-blur-xl p-5 border border-[var(--app-danger)]/15">
        <h3 className="text-[16px] font-medium text-[var(--app-danger)] mb-2">Danger Zone</h3>
        <p className="text-[13px] text-[var(--app-text-muted)] mb-4">
          Irreversible actions that affect your account
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard/settings/danger">
            <button className="inline-flex items-center rounded-[6px] bg-[var(--app-danger)] px-3 py-1.5 text-[13px] font-medium text-[var(--app-bg)] transition-colors hover:opacity-90 w-full sm:w-auto">
              Delete Account
            </button>
          </Link>
          <button className="inline-flex items-center rounded-[6px] border border-[var(--app-border)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] w-full sm:w-auto">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
}
