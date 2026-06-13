'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Gift,
  LogOut,
  Settings,
  User as UserIcon,
  BookOpen,
  MessageCircle,
  MessageSquarePlus,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';

import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function AccountMenu({
  align = 'end',
  className,
}: {
  align?: 'start' | 'end';
  className?: string;
}) {
  const router = useRouter();
  const { user } = useSessionStore();

  const openPublicPage = (path: string) => {
    if (typeof window === 'undefined') return;
    window.open(path, '_blank', 'noopener,noreferrer');
  };

  const initial = useMemo(() => {
    return (
      user?.displayName?.charAt(0)?.toUpperCase() ||
      user?.email?.charAt(0)?.toUpperCase() ||
      'U'
    );
  }, [user?.displayName, user?.email]);

  const handleLogout = async () => {
    try {
      await console.log('signed out')
    } finally {
      // Hard redirect forces middleware to re-check auth and breaks any stale Zustand persist
      window.location.href = '/';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'h-8 w-8 p-0 inline-flex items-center justify-center rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] text-sm font-medium text-[var(--app-text)] outline-none transition-colors hover:bg-[var(--app-panel-2)]',
          className
        )}
        aria-label="Account menu"
        title="Account"
      >
        {initial}
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-[320px] p-0 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)]">
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 inline-flex items-center justify-center rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] text-sm font-semibold text-[var(--app-text)]"
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-none truncate text-[var(--app-text)]">
                {user?.displayName || 'Developer'}
              </p>
              <p className="text-xs leading-none text-[var(--app-text-muted)] truncate mt-1">
                {user?.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="py-1">
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/settings')}
            className="cursor-pointer px-4 text-[13px]"
          >
            <UserIcon className="mr-3 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/settings')}
            className="cursor-pointer px-4 text-[13px]"
          >
            <Settings className="mr-3 h-4 w-4" />
            Account Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => router.push('/dashboard/pricing')}
            className="cursor-pointer px-4 text-[13px]"
          >
            <CreditCard className="mr-3 h-4 w-4" />
            Pricing
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openPublicPage('/docs')}
            className="cursor-pointer px-4 text-[13px]"
          >
            <BookOpen className="mr-3 h-4 w-4" />
            Documentation
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => openPublicPage('/contact')}
            className="cursor-pointer px-4 text-[13px]"
          >
            <MessageCircle className="mr-3 h-4 w-4" />
            Feedback
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/referrals')}
            className="cursor-pointer px-4 text-[13px]"
          >
            <Gift className="mr-3 h-4 w-4" />
            Refer
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => router.push('/dashboard')}
            className="cursor-pointer px-4 text-[13px]"
          >
            <MessageSquarePlus className="mr-3 h-4 w-4" />
            New Chat
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        <div className="px-4 py-3">
          <div className="text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-2">
            Preferences
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[13px] text-[var(--app-text)]">Theme</div>
            <ThemeToggle className="h-9 w-9" />
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="py-1">
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer px-4 text-[13px]">
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
