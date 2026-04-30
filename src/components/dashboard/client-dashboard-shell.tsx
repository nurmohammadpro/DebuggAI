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
  LogOut,
  User,
  Moon,
  Sun,
} from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import { useTheme } from 'next-themes';
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
  },
  {
    title: 'Debug',
    href: '/dashboard/debug',
    icon: Bug,
  },
  {
    title: 'Web Builder',
    href: '/dashboard/web-builder',
    icon: Code2,
  },
  {
    title: 'Pricing',
    href: '/dashboard/pricing',
    icon: CreditCard,
  },
  {
    title: 'Referrals',
    href: '/dashboard/referrals',
    icon: Gift,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: SettingsIcon,
  },
];

interface ClientDashboardShellProps {
  children: React.ReactNode;
}

export function ClientDashboardShell({ children }: ClientDashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useSessionStore();
  const { theme, setTheme } = useTheme();
  const credits = user?.credits;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
    router.push('/');
  };

  // Don't show sidebar for workspace (main dashboard route) and web builder
  if (pathname === '/dashboard' || pathname === '/dashboard/web-builder') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-64 z-40 h-14 bg-background border-b">
        <div className="flex h-14 items-center justify-between px-6">
          {/* Page Title */}
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-medium text-muted-foreground">
              {navItems.find(item => pathname.startsWith(item.href))?.title || 'Dashboard'}
            </h1>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Credits Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Zap className="h-3.5 w-3.5" />
              <span>{credits === -1 ? 'Unlimited' : credits}</span>
            </div>

            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20"
                >
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">Account Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/pricing">Billing</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card hidden lg:flex flex-col">
        {/* Logo */}
        <div className="h-14 flex items-center px-6">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Logo className="h-6 w-auto" />
            <span className="font-semibold text-base font-mono text-foreground">
              DeBuggAI
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden">
        <header className="sticky top-0 z-40 h-14 bg-background border-b">
          <div className="flex h-14 items-center justify-between px-4">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <Logo className="h-5 w-auto" />
              <span className="font-semibold text-sm font-mono text-foreground">
                DeBuggAI
              </span>
            </Link>

            <div className="flex items-center gap-2">
              {/* Credits */}
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Zap className="h-3 w-3" />
                <span>{credits === -1 ? '∞' : credits}</span>
              </div>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="h-8 w-8 rounded-full bg-primary/10"
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.displayName || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
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
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Mobile Navigation */}
        <nav className="border-t bg-background">
          <div className="grid grid-cols-6 gap-1 p-2">
            {navItems.map((item) => {
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
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="truncate w-full text-center">{item.title}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Main Content */}
      <main className="lg:pl-64 min-h-screen pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}
