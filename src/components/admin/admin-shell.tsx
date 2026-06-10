'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BarChart3, Users, CreditCard, Activity, Play, Bot } from 'lucide-react';

import { ThemeToggle } from '@/components/theme-toggle';
import { useSessionStore } from '@/store/session-store';
import { BrandLockup } from '@/components/logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';

const navItems = [
  { href: '/dashboard/admin', label: 'Analytics', icon: BarChart3, description: 'Platform health and usage' },
  { href: '/dashboard/admin/users', label: 'Users', icon: Users, description: 'Accounts, roles, and status' },
  { href: '/dashboard/admin/credits', label: 'Credits', icon: CreditCard, description: 'Transactions and balances' },
  { href: '/dashboard/admin/runs', label: 'Runs', icon: Play, description: 'Agent runs and job inspection' },
  { href: '/dashboard/admin/monitoring', label: 'Monitoring', icon: Activity, description: 'System health and metrics' },
  { href: '/dashboard/admin/ai', label: 'AI Provider', icon: Bot, description: 'LLM API settings and keys' },
];

function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSessionStore();

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard/admin' && pathname.startsWith(href));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/dashboard/admin" className="flex items-center gap-3 rounded-md hover:opacity-80 transition-opacity group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
          <BrandLockup
            className="gap-3 group-data-[collapsible=icon]:gap-0"
            logoClassName="h-8 w-8"
            textClassName="text-sm font-semibold whitespace-nowrap group-data-[collapsible=icon]:hidden"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                    onClick={() => router.push(item.href)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50 group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-medium text-sidebar-foreground/70">
            {user?.email?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-[13px] font-normal text-sidebar-foreground">
              {user?.displayName || user?.email?.split('@')[0] || 'Admin'}
            </p>
            <p className="truncate text-[11px] text-sidebar-foreground/50">
              {user?.email || 'admin'}
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <AdminSidebar />

      <SidebarInset>
        <header className="sticky top-0 z-20 flex flex-wrap items-start justify-between gap-4 border-b border-[var(--app-border)] bg-[color-mix(in_srgb,var(--app-bg)_88%,transparent)] px-6 py-4 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <SidebarTrigger className="md:hidden" />
            <div>
              <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
                Admin
              </h1>
              <p className="mt-1 max-w-[60ch] text-[13px] font-normal text-[var(--app-text-muted)]">
                Manage users, credits, and platform settings
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <ThemeToggle className="h-9 w-9 rounded-[10px] border border-[var(--app-border-strong)] bg-[var(--app-panel)] text-[var(--app-text-muted)] shadow-none hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]" />
          </div>
        </header>

        <main className="flex-1 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
