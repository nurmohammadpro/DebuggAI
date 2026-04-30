/**
 * Client Dashboard Shell
 *
 * Provides sidebar navigation for client dashboard pages
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  Bug,
  Code2,
  CreditCard,
  Gift,
  Settings as SettingsIcon,
  History,
  Users,
} from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Logo } from '@/components/logo';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Zap } from 'lucide-react';

const navItems = [
  {
    title: 'Projects',
    href: '/dashboard',
    icon: Home,
    description: 'Your workspace and projects',
  },
  {
    title: 'Debug',
    href: '/dashboard/debug',
    icon: Bug,
    description: 'AI code debugging',
  },
  {
    title: 'Web Builder',
    href: '/dashboard/web-builder',
    icon: Code2,
    description: 'Generate web applications',
  },
  {
    title: 'Pricing',
    href: '/dashboard/pricing',
    icon: CreditCard,
    description: 'Plans and billing',
  },
  {
    title: 'Referrals',
    href: '/dashboard/referrals',
    icon: Gift,
    description: 'Invite friends, earn credits',
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: SettingsIcon,
    description: 'Account settings',
  },
];

interface ClientDashboardShellProps {
  children: React.ReactNode;
}

export function ClientDashboardShell({ children }: ClientDashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useSessionStore();
  const credits = user?.credits;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/');
  };

  // Don't show sidebar for workspace (main dashboard route)
  if (pathname === '/dashboard') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card hidden lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center border-b px-6">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Logo className="h-6 w-auto" />
              <span className="font-semibold text-base font-mono text-foreground">
                DeBuggAI
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{item.title}</div>
                    <div
                      className={cn(
                        'text-xs truncate',
                        isActive
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                      )}
                    >
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/20">
              <Zap className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Credits</div>
                <div className="text-sm font-medium">
                  {credits === -1 ? 'Unlimited' : credits}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between px-3">
              <span className="text-xs text-muted-foreground">
                {user?.email}
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden sticky top-0 z-40 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-14 items-center px-4">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Logo className="h-6 w-auto" />
            <span className="font-semibold text-base font-mono text-foreground">
              DeBuggAI
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {/* Credits */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/20">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium">
                {credits === -1 ? '∞' : credits}
              </span>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 rounded-full p-0"
                  style={{
                    background: 'var(--ds-green-muted)',
                    border: '2px solid rgba(0,200,83,0.3)',
                  }}
                >
                  <span className="text-xs font-semibold text-primary">
                    {user?.displayName?.charAt(0)?.toUpperCase() ||
                      user?.email?.charAt(0)?.toUpperCase() ||
                      'U'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Projects</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/debug">Debug</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/web-builder">Web Builder</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/pricing">Pricing</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/referrals">Referrals</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="border-t px-2 py-3">
          <div className="grid grid-cols-3 gap-1">
            {navItems.slice(0, 6).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-md px-2 py-2 text-xs transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-accent'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate w-full text-center">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="lg:pl-64 min-h-screen">
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
