'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, BarChart3, Users, CreditCard, Activity } from 'lucide-react';

import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';

const navItems = [
  { href: '/dashboard/admin', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users },
  { href: '/dashboard/admin/credits', label: 'Credits', icon: CreditCard },
  { href: '/dashboard/admin/monitoring', label: 'Monitoring', icon: Activity },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-border/40 bg-card">
        <div className="h-12 px-4 flex items-center gap-2 border-b border-border/40">
          <Link href="/dashboard/admin" className="flex items-center gap-2">
            <Logo className="h-5 w-auto" />
          </Link>
          <div className="ml-auto inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple/10 border border-purple/20 text-purple">
            <Shield className="h-3.5 w-3.5" />
            Admin
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`h-10 px-3 rounded-md flex items-center gap-2 text-sm transition-colors ${
                  active
                    ? 'bg-muted/60 text-foreground'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 px-4 flex items-center gap-2 border-b border-border/40 bg-card sticky top-0 z-40">
          <div className="text-sm font-semibold">Admin</div>
          <div className="flex-1" />
          <ThemeToggle className="h-9 w-9" />
          <WorkspaceAccountMenu />
        </header>

        <main className="flex-1 min-h-0 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
