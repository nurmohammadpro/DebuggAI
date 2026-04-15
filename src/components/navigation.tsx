/**
 * Navigation Component
 */

'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Bug, Code2, Zap, Settings, User, LogOut, Menu, Gift, Receipt } from 'lucide-react';
import { useSessionStore } from '@/store/session-store';
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export function Navigation() {
  const { user, credits, isAuthenticated, setUser, setCredits, logout } =
    useSessionStore();

  const channelRef = useRef<RealtimeChannel>();

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
        // Unsubscribe from credits channel
        if (channelRef.current) {
          channelRef.current.unsubscribe();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, [setUser]);

  const fetchCredits = async (userId: string) => {
    const { data } = await supabase
      .from('credit_wallets')
      .select('balance')
      .eq('owner_id', userId)
      .single();

    if (data) {
      setCredits(data.balance);
    }
  };

  const subscribeToCredits = (userId: string) => {
    // Subscribe to credit wallet changes
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
  };

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
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center space-x-2">
          <Bug className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">DeBuggAI</span>
        </Link>

        {/* Main Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/debug"
            className="flex items-center text-sm font-medium transition-colors hover:text-primary"
          >
            <Bug className="mr-2 h-4 w-4" />
            Debug
          </Link>
          <Link
            href="/web-builder"
            className="flex items-center text-sm font-medium transition-colors hover:text-primary"
          >
            <Code2 className="mr-2 h-4 w-4" />
            Web Builder
          </Link>
          <Link
            href="/pricing"
            className="flex items-center text-sm font-medium transition-colors hover:text-primary"
          >
            <Zap className="mr-2 h-4 w-4" />
            Upgrade
          </Link>
        </div>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {/* Credits Badge */}
          <Badge variant="outline" className="hidden sm:flex">
            <Zap className="mr-1 h-3 w-3" />
            {credits === -1 ? '∞' : credits} credits
          </Badge>

          {/* User Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <User className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">{user?.displayName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex w-full items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/transactions" className="flex w-full items-center">
                  <Receipt className="mr-2 h-4 w-4" />
                  Transactions
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/referrals" className="flex w-full items-center">
                  <Gift className="mr-2 h-4 w-4" />
                  Referrals
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="sm" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
