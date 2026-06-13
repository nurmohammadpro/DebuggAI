'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Zap } from 'lucide-react';
import { BrandLockup } from '@/components/logo';
import { useSessionStore } from '@/store/session-store';
import { useState } from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { NotificationCenter } from '@/components/dashboard/notification-center';
import { useClerk, useUser } from '@clerk/nextjs';

export function Navigation() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const profile = useSessionStore((s) => s.profile);
  const credits = profile?.credits;
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      window.location.href = '/';
    }
  };

  return (
    <nav className="navbar w-full">
      <div className="container mx-auto px-4 flex items-center">
        <Link href={isSignedIn ? "/dashboard" : "/"} className="nav-logo">
          <BrandLockup
            logoClassName="h-6 w-6"
            textClassName="text-[15px] font-semibold"
          />
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-1 ml-8">
          <Link href="/features" className="nav-link">Features</Link>
          <Link href="/demo" className="nav-link">Live Demo</Link>
          <Link href="/languages" className="nav-link">Languages</Link>
          <Link href="/pricing" className="nav-link">Pricing</Link>
          <Link href="/faq" className="nav-link">FAQ</Link>
        </div>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-2">
          {isSignedIn ? (
            <>
              {/* Credits Badge */}
              <div className="nav-credit">
                <Zap className="h-3 w-3" style={{ color: 'var(--app-accent)' }} />
                {credits === -1 ? '∞' : credits}
              </div>

              <NotificationCenter />

              <ThemeToggle />

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-[6px]"
                  >
                    {user?.fullName || user?.firstName || 'Developer'?.charAt(0)?.toUpperCase() || user?.primaryEmailAddress?.emailAddress || ''?.charAt(0)?.toUpperCase() || 'U'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.fullName || user?.firstName || 'Developer'}</p>
                      <p className="text-[11px] leading-none text-[var(--app-text-muted)]">{user?.primaryEmailAddress?.emailAddress || ''}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard/debug')} className="cursor-pointer">
                    Debug
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/web-builder')} className="cursor-pointer">
                    Web Builder
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/pricing')} className="cursor-pointer">
                    Pricing
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/referrals')} className="cursor-pointer">
                    Referrals
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard/settings')} className="cursor-pointer">
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.push('/dashboard/settings/transactions')} className="cursor-pointer">
                    Transactions
                  </DropdownMenuItem>
                  {(profile?.isAdmin ?? false) && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => router.push('/dashboard/admin')} className="cursor-pointer">
                        Admin Panel
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/login">
              <Button>
                Sign In
              </Button>
            </Link>
          )}

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              className="md:hidden"
              render={
                <Button variant="ghost" size="icon" aria-label="Toggle menu" />
              }
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-64 pt-12">
              <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
              <div className="flex flex-col gap-1">
                <Link href="/features" className="mobile-menu-item" onClick={() => setMobileOpen(false)}>Features</Link>
                <Link href="/demo" className="mobile-menu-item" onClick={() => setMobileOpen(false)}>Live Demo</Link>
                <Link href="/languages" className="mobile-menu-item" onClick={() => setMobileOpen(false)}>Languages</Link>
                <Link href="/pricing" className="mobile-menu-item" onClick={() => setMobileOpen(false)}>Pricing</Link>
                <Link href="/faq" className="mobile-menu-item" onClick={() => setMobileOpen(false)}>FAQ</Link>
                {!isSignedIn && (
                  <>
                    <div className="border-t border-[var(--app-border-strong)] my-2" />
                    <Link href="/login" className="mobile-menu-item" onClick={() => setMobileOpen(false)}>Sign In</Link>
                    <Link href="/signup" className="mobile-menu-item" onClick={() => setMobileOpen(false)}>Sign Up</Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
