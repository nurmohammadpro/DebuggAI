/**
 * Navigation Component - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Bell,
  Menu,
  Zap,
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { useSessionStore } from '@/store/session-store';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from '@/components/theme-toggle';

export function Navigation() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useSessionStore();
  const credits = user?.credits;

  const [menuOpen, setMenuOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    logout();
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar w-full">
      <div className="container mx-auto px-4 flex items-center">
        {/* Logo & Brand - JetBrains Mono font */}
        <Link href={isAuthenticated ? "/dashboard" : "/"} className="nav-logo flex items-center gap-2.5">
          <Logo className="h-6 w-auto" />
          <span className="font-semibold text-base font-mono" style={{ color: 'var(--ds-text)' }}>
            DeBuggAI
          </span>
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
          {isAuthenticated ? (
            <>
              {/* Credits Badge */}
              <div className="nav-credit">
                <Zap className="h-3 w-3" style={{ color: 'var(--ds-green)' }} />
                {credits === -1 ? '∞' : credits}
              </div>

              {/* Notifications */}
              <button className="nav-notif" onClick={() => setHasNotifications(false)}>
                <Bell className="h-4 w-4" />
                {hasNotifications && <div className="notif-dot"></div>}
              </button>

              <ThemeToggle className="nav-notif" />

              {/* User Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="nav-avatar"
                    style={{
                      width: '30px',
                      height: '30px',
                      padding: '0',
                      borderRadius: '50%',
                      background: 'var(--ds-green-muted)',
                      border: '2px solid rgba(0,200,83,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: 'var(--ds-green)',
                    }}
                  >
                    {user?.displayName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
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
                  {user?.isAdmin && (
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
              <Button size="sm">
                Sign In
              </Button>
            </Link>
          )}

          {/* Mobile Menu Button */}
          <div className="relative md:hidden" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="nav-link p-2"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Menu Dropdown */}
            {menuOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-56 animate-slide-down z-50"
                style={{
                  background: 'var(--ds-surface)',
                  border: '1px solid var(--ds-border2)',
                  borderRadius: 'var(--ds-r12)',
                  boxShadow: 'var(--ds-shadow-card)',
                }}
              >
                <Link
                  href="/features"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  Features
                </Link>
                <Link
                  href="/demo"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  Live Demo
                </Link>
                <Link
                  href="/languages"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  Languages
                </Link>
                <Link
                  href="/pricing"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  Pricing
                </Link>
                <Link
                  href="/faq"
                  className="mobile-menu-item"
                  onClick={closeMenu}
                >
                  FAQ
                </Link>
                {!isAuthenticated && (
                  <>
                    <div className="border-t border-border2 my-2"></div>
                    <Link
                      href="/login"
                      className="mobile-menu-item"
                      onClick={closeMenu}
                    >
                      Sign In
                    </Link>
                    <Link
                      href="/signup"
                      className="mobile-menu-item"
                      onClick={closeMenu}
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
