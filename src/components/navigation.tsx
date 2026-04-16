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
import { 
  Zap, 
  Settings, 
  LogOut, 
  Gift, 
  Receipt, 
  Shield, 
  Bell, 
  Menu, 
  Globe, 
  CreditCard, 
  Sparkles, 
  Play, 
  Code, 
  HelpCircle, 
  LogIn, 
  Rocket 
} from 'lucide-react';
import { Logo } from '@/components/logo';
import { useSessionStore } from '@/store/session-store';
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export function Navigation() {
  const { user, isAuthenticated, setUser, setCredits, logout } =
    useSessionStore();
  const credits = user?.credits;

  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(true);
  const channelRef = useRef<RealtimeChannel | undefined>(undefined);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu when clicking outside
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

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLogout = async () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    setMenuOpen(false);
    await supabase.auth.signOut();
    logout();
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar flex items-center">
      {/* Logo & Brand */}
      <Link href={isAuthenticated ? "/dashboard" : "/"} className="nav-logo flex items-center gap-2">
        <Logo className="h-6 w-auto" />
        <span className="font-semibold text-base">DeBuggAI</span>
      </Link>

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
                  <Link href="/dashboard/debug" className="flex w-full items-center cursor-pointer">
                    <Zap className="mr-2 h-4 w-4" />
                    Debug
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/dashboard/web-builder" className="flex w-full items-center cursor-pointer">
                    <Globe className="mr-2 h-4 w-4" />
                    Web Builder
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/dashboard/pricing" className="flex w-full items-center cursor-pointer">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pricing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/dashboard/referrals" className="flex w-full items-center cursor-pointer">
                    <Gift className="mr-2 h-4 w-4" />
                    Referrals
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link href="/dashboard/settings" className="flex w-full items-center cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/dashboard/settings/transactions" className="flex w-full items-center cursor-pointer">
                    <Receipt className="mr-2 h-4 w-4" />
                    Transactions
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Link href="/dashboard/admin" className="flex w-full items-center cursor-pointer">
                        <Shield className="mr-2 h-4 w-4" />
                        Admin Panel
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
          </>
        ) : (
          <Link href="/login">
            <Button size="sm" className="h-8 bg-[#00C853] hover:bg-[#00E676] text-white">
              Sign In
            </Button>
          </Link>
        )}

        {/* Menu Button - Always visible on all screens */}
        <div className="relative" ref={menuRef}>
          <button
            className="nav-link p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border2 bg-[#0A0A0A] shadow-xl animate-slide-down z-50">
              {isAuthenticated ? (
                <>
                  <div className="px-3 py-2 border-b border-border2">
                    <p className="text-xs text-muted-foreground">Navigation</p>
                  </div>
                  <Link href="/dashboard/debug" className="mobile-menu-item" onClick={closeMenu}>
                    <Zap className="mr-2 h-4 w-4" />
                    Debug
                  </Link>
                  <Link href="/dashboard/web-builder" className="mobile-menu-item" onClick={closeMenu}>
                    <Globe className="mr-2 h-4 w-4" />
                    Web Builder
                  </Link>
                  <Link href="/dashboard/pricing" className="mobile-menu-item" onClick={closeMenu}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pricing
                  </Link>
                  <Link href="/dashboard/referrals" className="mobile-menu-item" onClick={closeMenu}>
                    <Gift className="mr-2 h-4 w-4" />
                    Referrals
                  </Link>
                  <div className="border-t border-border2 my-1"></div>
                  <div className="px-3 py-2 border-b border-border2">
                    <p className="text-xs text-muted-foreground">Account</p>
                  </div>
                  <Link href="/dashboard/settings" className="mobile-menu-item" onClick={closeMenu}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                  <Link href="/dashboard/settings/transactions" className="mobile-menu-item" onClick={closeMenu}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Transactions
                  </Link>
                  {isAdmin && (
                    <Link href="/dashboard/admin" className="mobile-menu-item" onClick={closeMenu}>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  )}
                  <div className="border-t border-border2 my-1"></div>
                  <button
                    onClick={handleLogout}
                    className="mobile-menu-item w-full text-left"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <div className="px-3 py-2 border-b border-border2">
                    <p className="text-xs text-muted-foreground">Pages</p>
                  </div>
                  <Link href="/features" className="mobile-menu-item" onClick={closeMenu}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Features
                  </Link>
                  <Link href="/demo" className="mobile-menu-item" onClick={closeMenu}>
                    <Play className="mr-2 h-4 w-4" />
                    Live Demo
                  </Link>
                  <Link href="/languages" className="mobile-menu-item" onClick={closeMenu}>
                    <Code className="mr-2 h-4 w-4" />
                    Languages
                  </Link>
                  <Link href="/pricing" className="mobile-menu-item" onClick={closeMenu}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pricing
                  </Link>
                  <Link href="/faq" className="mobile-menu-item" onClick={closeMenu}>
                    <HelpCircle className="mr-2 h-4 w-4" />
                    FAQ
                  </Link>
                  <div className="border-t border-border2 my-1"></div>
                  <Link href="/login" className="mobile-menu-item" onClick={closeMenu}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Link>
                  <Link href="/signup" className="mobile-menu-item" onClick={closeMenu}>
                    <Rocket className="mr-2 h-4 w-4" />
                    Get Started
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}