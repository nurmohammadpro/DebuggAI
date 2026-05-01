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
  const { user, logout } = useSessionStore();

  const initial = useMemo(() => {
    return (
      user?.displayName?.charAt(0)?.toUpperCase() ||
      user?.email?.charAt(0)?.toUpperCase() ||
      'U'
    );
  }, [user?.displayName, user?.email]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'h-8 w-8 p-0 rounded-full inline-flex items-center justify-center text-xs font-semibold outline-none',
          className
        )}
        style={{
          background: 'var(--ds-green-muted)',
          border: '2px solid rgba(0,200,83,0.3)',
          color: 'var(--ds-green)',
        }}
        aria-label="Account menu"
        title="Account"
      >
        {initial}
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align} className="w-[320px] p-0 overflow-hidden">
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex items-center gap-3">
            <div
              className="h-9 w-9 rounded-full inline-flex items-center justify-center text-sm font-semibold"
              style={{
                background: 'var(--ds-green-muted)',
                border: '2px solid rgba(0,200,83,0.25)',
                color: 'var(--ds-green)',
              }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-none truncate">
                {user?.displayName || 'Developer'}
              </p>
              <p className="text-xs leading-none text-muted-foreground truncate mt-1">
                {user?.email}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className="py-1">
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/settings')}
            className="cursor-pointer px-4"
          >
            <UserIcon className="mr-3 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/settings')}
            className="cursor-pointer px-4"
          >
            <Settings className="mr-3 h-4 w-4" />
            Account Settings
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => router.push('/dashboard/pricing')}
            className="cursor-pointer px-4"
          >
            <CreditCard className="mr-3 h-4 w-4" />
            Pricing
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/docs')}
            className="cursor-pointer px-4"
          >
            <BookOpen className="mr-3 h-4 w-4" />
            Documentation
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/contact')}
            className="cursor-pointer px-4"
          >
            <MessageCircle className="mr-3 h-4 w-4" />
            Feedback
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/referrals')}
            className="cursor-pointer px-4"
          >
            <Gift className="mr-3 h-4 w-4" />
            Refer
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => router.push('/dashboard')}
            className="cursor-pointer px-4"
          >
            <MessageSquarePlus className="mr-3 h-4 w-4" />
            New Chat
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator />

        <div className="px-4 py-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">
            Preferences
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">Theme</div>
            <ThemeToggle className="h-9 w-9" />
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="py-1">
          {user?.isAdmin && (
            <>
              <DropdownMenuItem
                onClick={() => router.push('/dashboard/admin')}
                className="cursor-pointer px-4"
              >
                Admin Panel
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer px-4">
            <LogOut className="mr-3 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

