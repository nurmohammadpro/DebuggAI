'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Settings, LayoutDashboard, Bug, Code2, CreditCard } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useSessionStore } from '@/store/session-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function WorkspaceAccountMenu() {
  const router = useRouter();
  const { user, logout } = useSessionStore();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/');
  };

  const initial =
    user?.displayName?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="h-8 w-8 p-0 rounded-full inline-flex items-center justify-center text-xs font-semibold outline-none"
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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.displayName || 'Developer'}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/dashboard/home')}
          className="cursor-pointer"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard Home
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/dashboard/debug')}
          className="cursor-pointer"
        >
          <Bug className="mr-2 h-4 w-4" />
          Debug
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/dashboard/web-builder')}
          className="cursor-pointer"
        >
          <Code2 className="mr-2 h-4 w-4" />
          Web Builder
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/dashboard/pricing')}
          className="cursor-pointer"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Pricing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push('/dashboard/settings')}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        {user?.isAdmin && (
          <DropdownMenuItem
            onClick={() => router.push('/dashboard/admin')}
            className="cursor-pointer"
          >
            Admin Panel
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
