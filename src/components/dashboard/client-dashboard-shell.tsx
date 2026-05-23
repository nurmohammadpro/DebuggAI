/**
 * Client Dashboard Shell
 *
 * Shared shell for client dashboard pages.
 * All pages now use UnifiedLayout for consistent sidebar and navigation.
 */

'use client';

import { usePathname } from 'next/navigation';
import { UnifiedLayout } from '@/components/dashboard/sidebar/unified-layout';

interface ClientDashboardShellProps {
  children: React.ReactNode;
}

export function ClientDashboardShell({ children }: ClientDashboardShellProps) {
  const pathname = usePathname();

  // These routes handle their own layout completely
  if (pathname === '/dashboard' || pathname?.includes('project=')) {
    return <>{children}</>;
  }

  // For all other dashboard pages, use UnifiedLayout
  // Derive title from pathname
  const getTitle = () => {
    if (pathname === '/dashboard/home') return { title: 'Projects', subtitle: 'Manage your projects' };
    if (pathname === '/dashboard/web-builder') return { title: 'Web Builder', subtitle: 'Build and preview your web applications' };
    if (pathname === '/dashboard/debug') return { title: 'Debug Session', subtitle: 'AI-powered code debugging' };
    if (pathname?.startsWith('/dashboard/runs')) return { title: 'Runs', subtitle: 'Execution history and step trace' };
    if (pathname?.startsWith('/dashboard/settings')) return { title: 'Settings', subtitle: 'Manage your account preferences' };
    if (pathname === '/dashboard/pricing') return { title: 'Pricing', subtitle: 'View plans and pricing' };
    if (pathname === '/dashboard/referrals') return { title: 'Referrals', subtitle: 'Invite friends and earn rewards' };
    if (pathname?.startsWith('/dashboard/admin')) return { title: 'Admin', subtitle: 'Admin panel' };
    return { title: 'Dashboard', subtitle: '' };
  };

  const { title, subtitle } = getTitle();

  return (
    <UnifiedLayout title={title} subtitle={subtitle}>
      {children}
    </UnifiedLayout>
  );
}
