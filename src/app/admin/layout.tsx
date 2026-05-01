/**
 * Admin Dashboard Layout
 *
 * Main layout for the admin dashboard with navigation and shell.
 */

import { ReactNode } from 'react';
import Link from 'next/link';
import { getCurrentUser, adminSignOut } from '@/lib/admin/auth';
import { redirect } from 'next/navigation';
import {
  BugIcon,
  LayoutDashboardIcon,
  UsersIcon,
  CoinsIcon,
  FileTextIcon,
  ShieldAlertIcon,
  UserPlusIcon,
  SettingsIcon,
  LogOutIcon,
  BellIcon,
} from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (!user.is_admin) {
    redirect('/');
  }

  async function handleSignOut() {
    'use server';
    await adminSignOut();
    redirect('/login');
  }

  const navItems = [
    { id: 'overview', label: 'Overview', href: '/admin', icon: LayoutDashboardIcon },
    { id: 'users', label: 'Users', href: '/admin/users', icon: UsersIcon },
    { id: 'credits', label: 'Credits', href: '/admin/credits', icon: CoinsIcon },
    { id: 'audit', label: 'Audit', href: '/admin/audit', icon: FileTextIcon },
    { id: 'abuse', label: 'Abuse', href: '/admin/abuse', icon: ShieldAlertIcon },
    { id: 'referrals', label: 'Referrals', href: '/admin/referrals', icon: UserPlusIcon },
    { id: 'settings', label: 'Settings', href: '/admin/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#0A0D0A] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#111411] border-r border-[#1F2B1F] flex flex-col">
        {/* Logo */}
        <Link href="/admin" className="h-[52px] flex items-center px-5 gap-3 border-b border-[#1F2B1F]">
          <div className="w-7 h-7 rounded-md bg-[#00C853]/10 border border-[#00C853]/30 flex items-center justify-center">
            <BugIcon className="w-4 h-4 text-[#00C853]" />
          </div>
          <span className="text-lg font-semibold text-[#E8F5E9]">Admin Console</span>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-[#8BAD8B] hover:text-[#E8F5E9] hover:bg-[#171C17] transition-all duration-150"
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="p-3 border-t border-[#1F2B1F]">
          <div className="flex items-center gap-3 px-3 py-2">
            <button className="w-9 h-9 rounded-md bg-[#171C17] border border-[#1F2B1F] flex items-center justify-center text-[#8BAD8B] hover:border-[#00C853] hover:text-[#00C853] transition-colors">
              <BellIcon className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#E8F5E9] truncate">{user.full_name || 'Admin'}</p>
              <p className="text-xs text-[#4D6B4D] truncate">{user.email}</p>
            </div>

            <form action={handleSignOut}>
              <button
                type="submit"
                className="w-9 h-9 rounded-md bg-[#171C17] border border-[#1F2B1F] flex items-center justify-center text-[#8BAD8B] hover:border-[#00C853] hover:text-[#00C853] transition-colors"
                title="Sign out"
              >
                <LogOutIcon className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
