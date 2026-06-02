'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import {
  Home,
  Pencil,
  Bug,
  ListChecks,
  GitBranch,
  Zap,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { cn } from '@/lib/utils';

export function V0Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useSessionStore();
  const { resolvedTheme, setTheme } = useTheme();

  const activeProjectId = searchParams?.get('project');

  const isWorkspace = pathname === '/dashboard' && !!activeProjectId;
  const isDashboardHome = pathname === '/dashboard' && !activeProjectId;
  const isDebug = pathname === '/dashboard/debug' || pathname.startsWith('/dashboard/debug/');
  const isRuns = pathname === '/dashboard/runs' || pathname.startsWith('/dashboard/runs/');
  const isBranches = pathname === '/dashboard/branches';

  const navItems = [
    { href: '/dashboard/home', icon: Home, label: 'Home', active: isDashboardHome },
    { href: `/dashboard?project=${activeProjectId || ''}`, icon: Pencil, label: 'Builder', active: isWorkspace },
    { href: '/dashboard/debug', icon: Bug, label: 'Debug', active: isDebug },
    { href: '/dashboard/runs', icon: ListChecks, label: 'Runs', active: isRuns },
    { href: '/dashboard/branches', icon: GitBranch, label: 'Branches', active: isBranches },
  ];

  const credits = user?.credits;

  return (
    <aside className="w-12 h-[100dvh] bg-zinc-950 border-r border-zinc-800 flex flex-col shrink-0 select-none">
      {/* Logo */}
      <div className="h-12 flex items-center justify-center shrink-0 border-b border-zinc-800">
        <Link href="/dashboard/home" className="flex items-center justify-center" title="DeBuggAI Home">
          <div className="w-7 h-7 rounded-md bg-[var(--app-accent)] flex items-center justify-center">
            <span className="text-[11px] font-black text-white leading-none">D</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center gap-1 py-3 px-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              title={item.label}
              className={cn(
                'w-9 h-9 rounded-[7px] flex items-center justify-center transition-colors',
                item.active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60'
              )}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="flex flex-col items-center gap-2 pb-3 px-1.5 border-t border-zinc-800 pt-3">
        {/* Credits */}
        <div
          className="w-9 h-9 rounded-[7px] flex items-center justify-center bg-zinc-800/50 text-zinc-400 transition-colors cursor-default"
          title={credits === -1 ? 'Unlimited credits' : `${credits ?? 0} credits`}
        >
          <Zap className="h-3.5 w-3.5" />
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="w-9 h-9 rounded-[7px] flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors"
          title="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>

        {/* Account */}
        <div title="Account">
          <WorkspaceAccountMenu />
        </div>
      </div>
    </aside>
  );
}
