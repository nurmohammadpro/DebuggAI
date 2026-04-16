/**
 * Navigation Component - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Bug, Zap, Settings, LogOut, Gift, Receipt, Shield, Bell, } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from '@/components/theme-toggle';

export function Navigation() {
  const { user, isAuthenticated, setUser, setCredits, logout } =
    useSessionStore();
  const credits = user?.credits;

  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true);
  const channelRef = useRef<RealtimeChannel | undefined>(undefined);

  const fetchCredits = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('credit_wallets')
      .select('balance')
      .eq('owner_id', userId)
      .single();

    if (data) {
      setCredits(data.balance);
    }

    // Fetch admin status
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    setIsAdmin(profile?.is_admin ?? false);
  }, [setCredits]);

  const subscribeToCredits = useCallback((userId: string) => {
    const channel = supabase
      .channel(`credits:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'credit_wallets',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          const newBalance = payload.new.balance;
          setCredits(newBalance);
        }
      )
      .subscribe();

    channelRef.current = channel;
  }, [setCredits]);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata.full_name || session.user.email || '',
          avatarUrl: session.user.user_metadata.avatar_url,
          plan: session.user.user_metadata.plan || 'free',
          credits: 0,
        });

        fetchCredits(session.user.id);
        subscribeToCredits(session.user.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          displayName: session.user.user_metadata.full_name || session.user.email || '',
          avatarUrl: session.user.user_metadata.avatar_url,
          plan: session.user.user_metadata.plan || 'free',
          credits: 0,
        });
        fetchCredits(session.user.id);
        subscribeToCredits(session.user.id);
      } else {
        setUser(null);
        if (channelRef.current) {
          channelRef.current.unsubscribe();
        }
      }
    });

    const channel = channelRef.current;
    return () => {
      subscription.unsubscribe();
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [setUser, fetchCredits, subscribeToCredits]);

  const handleLogout = async () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    await supabase.auth.signOut();
    logout();
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="navbar hidden md:flex">
        <Link href="/dashboard" className="nav-logo">
          <div className="nav-logo-icon">
            <Bug className="h-3 w-3" style={{ color: 'var(--ds-green)' }} />
          </div>
          <span>DeBuggAI</span>
        </Link>

        <div className="nav-links">
          <Link href="/debug">
            <button className="nav-link">Debug</button>
          </Link>
          <Link href="/web-builder">
            <button className="nav-link">Web Builder</button>
          </Link>
          <Link href="/pricing">
            <button className="nav-link">Pricing</button>
          </Link>
        </div>

        <div className="nav-actions flex items-center gap-2">
          {/* Credits Badge - DeBuggAI Design System */}
          <div className="nav-credit">
            <Zap className="h-3 w-3" style={{ color: 'var(--ds-green)' }} />
            {credits === -1 ? '∞' : credits}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications */}
          <button className="nav-notif" onClick={() => setHasNotifications(false)}>
            <Bell className="h-4 w-4" />
            {hasNotifications && <div className="notif-dot"></div>}
          </button>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger>
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
            <DropdownMenuContent align="end" className="w-48 animate-slide-down">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Link href="/settings" className="flex w-full items-center cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/settings/transactions" className="flex w-full items-center cursor-pointer">
                  <Receipt className="mr-2 h-4 w-4" />
                  Transactions
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href="/referrals" className="flex w-full items-center cursor-pointer">
                  <Gift className="mr-2 h-4 w-4" />
                  Referrals
                </Link>
              </DropdownMenuItem>
              {isAdmin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/admin" className="flex w-full items-center cursor-pointer">
                      <Shield className="mr-2 h-4 w-4" />
                      <span className="text-purple">Admin Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="md:hidden">
        <div className="navbar flex items-center px-5">
          <Link href="/dashboard" className="nav-logo">
            <div className="nav-logo-icon">
              <Bug className="h-3 w-3" style={{ color: 'var(--ds-green)' }} />
            </div>
            <span>DeBuggAI</span>
          </Link>

          <div className="flex items-center gap-2 ml-auto">
            {/* Credits Badge */}
            <div className="nav-credit">
              <Zap className="h-3 w-3" style={{ color: 'var(--ds-green)' }} />
              {credits === -1 ? '∞' : credits}
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Mobile Menu Button */}
            <div
              className="hamburger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <div className="hline"></div>
              <div className="hline"></div>
              <div className="hline"></div>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-menu animate-slide-down">
            <div className="mobile-menu-item">
              <span className="mobile-menu-icon">⌂</span>
              Dashboard
            </div>
            <div className="mobile-menu-item">
              <span className="mobile-menu-icon">🐛</span>
              Debug
            </div>
            <div className="mobile-menu-item">
              <span className="mobile-menu-icon">⚡</span>
              Web Builder
            </div>
            <div className="mobile-menu-item">
              <span className="mobile-menu-icon">💳</span>
              Pricing
            </div>
            <div className="mobile-menu-item">
              <span className="mobile-menu-icon">⚙</span>
              Settings
            </div>
            {isAdmin && (
              <div className="mobile-menu-item">
                <span className="mobile-menu-icon">🛡️</span>
                Admin
              </div>
            )}
            <div className="px-5 py-3 flex gap-2">
              <Link href="/login" className="btn btn-ghost flex-1 justify-center" style={{ height: '36px', fontSize: '13px' }}>
                Sign In
              </Link>
              <Link href="/signup" className="btn btn-primary flex-1 justify-center" style={{ height: '36px', fontSize: '13px' }}>
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
