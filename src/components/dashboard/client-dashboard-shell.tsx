/**
 * Client Dashboard Shell
 *
 * Shared shell for client dashboard pages.
 * All pages now use UnifiedLayout for consistent sidebar and navigation.
 */

'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { UnifiedLayout } from '@/components/dashboard/sidebar/unified-layout';

interface ClientDashboardShellProps {
  children: React.ReactNode;
}

export function ClientDashboardShell({ children }: ClientDashboardShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasProjectParam = searchParams.has('project');
  const isWorkspace = pathname === '/dashboard' && hasProjectParam;

  // Workspace (/dashboard?project=...) handles its own sidebar.
  if (isWorkspace) {
    return <>{children}</>;
  }

  // All other dashboard pages get sidebar via UnifiedLayout.
  const titleMap: Record<string, { title: string; subtitle: string }> = {
    '/dashboard/home': { title: 'Projects', subtitle: 'Manage your projects' },
    '/dashboard/web-builder': { title: 'Web Builder', subtitle: 'Build and preview your apps' },
    '/dashboard/debug': { title: 'Debug', subtitle: 'AI-powered debugging' },
    '/dashboard/pricing': { title: 'Pricing', subtitle: 'View plans and pricing' },
    '/dashboard/referrals': { title: 'Referrals', subtitle: 'Invite friends and earn rewards' },
  };

  const match = titleMap[pathname]
    || (pathname?.startsWith('/dashboard/runs') ? { title: 'Runs', subtitle: 'Execution history' } : null)
    || (pathname?.startsWith('/dashboard/settings') ? { title: 'Settings', subtitle: 'Account preferences' } : null)
    || (pathname?.startsWith('/dashboard/admin') ? { title: 'Admin', subtitle: 'Admin panel' } : null)
    || { title: 'Dashboard', subtitle: '' };

  return (
    <UnifiedLayout title={match.title} subtitle={match.subtitle}>
      {children}
    </UnifiedLayout>
  );
}
