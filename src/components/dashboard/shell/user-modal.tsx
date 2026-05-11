'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Settings, LogOut, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useSessionStore } from '@/store/session-store';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface UserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collapsed: boolean;
}

export function UserModal({ open, onOpenChange, collapsed }: UserModalProps) {
  const router = useRouter();
  const { user, logout } = useSessionStore();
  const [loading, setLoading] = useState(false);

  const userInitial = user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';
  const userDisplayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const userPlan = user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Free';
  const sidebarWidth = collapsed ? 68 : 280;

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      logout();
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{ width: sidebarWidth }}
        showCloseButton={false}
      >
        <div className="flex flex-col">
          {/* User Header */}
          <div className="p-4 border-b border-[var(--app-border)]">
            <div className="flex items-center gap-3">
              {user?.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={userDisplayName}
                  width={40}
                  height={40}
                  unoptimized
                  className="h-10 w-10 rounded-[8px] object-cover shrink-0"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] bg-[var(--app-surface)]">
                  <span className="text-sm font-medium text-[var(--app-text-muted)]">{userInitial}</span>
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[14px] font-medium text-[var(--app-text)] truncate">{userDisplayName}</span>
                <span className="text-[12px] text-[var(--app-text-dim)]">{userPlan} Plan</span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <Link
              href="/dashboard/settings"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-[13px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span className="flex-1">Settings</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--app-text-dim)]" />
            </Link>

            <button
              onClick={handleSignOut}
              disabled={loading}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-[8px] text-[13px] text-[var(--app-danger)] hover:bg-[var(--app-danger)]/10 transition-colors disabled:opacity-50"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="flex-1">{loading ? 'Signing out...' : 'Sign out'}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}