'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { useProject } from '@/hooks/queries/use-project';

const SEGMENT_LABELS: Record<string, string> = {
  home: 'Projects',
  debug: 'AI Debugger',
  history: 'History',
  'web-builder': 'Web Builder',
  pricing: 'Pricing',
  referrals: 'Referrals',
  settings: 'Settings',
  transactions: 'Transactions',
  admin: 'Admin',
  monitoring: 'Monitoring',
  users: 'Users',
  credits: 'Credits',
  projects: 'Projects',
  domains: 'Domains',
  'env-vars': 'Environment Variables',
  integrations: 'Integrations',
};

export function DashboardBreadcrumbs() {
  const pathname = usePathname();

  const segments = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    // Skip 'dashboard' — we show Home as the root
    const dashIdx = parts.indexOf('dashboard');
    const routeParts = dashIdx >= 0 ? parts.slice(dashIdx + 1) : parts;

    return routeParts.map((seg, i) => {
      const href = '/' + parts.slice(0, dashIdx + 1 + i + 1).join('/');
      const label = SEGMENT_LABELS[seg] || seg;
      const isDynamic = !SEGMENT_LABELS[seg] && seg.length > 2;
      return { seg, label, href, isDynamic };
    });
  }, [pathname]);

  const projectId = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    const projectsIdx = parts.indexOf('projects');
    if (projectsIdx >= 0 && parts[projectsIdx + 1]) {
      const maybeId = parts[projectsIdx + 1];
      return maybeId;
    }
    return null;
  }, [pathname]);

  const { data: project } = useProject(projectId || '', !!projectId);

  if (segments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground px-5 py-2 border-b border-border/40 overflow-x-auto">
      <Link
        href="/dashboard"
        className="hover:text-foreground transition-colors shrink-0 flex items-center gap-1"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        let label = seg.label;

        // For dynamic project ID segments, show the project name
        if (seg.isDynamic && seg.seg === projectId && project) {
          label = (project.description || project.prompt || seg.seg).slice(0, 40);
        }

        return (
          <span key={seg.href} className="flex items-center gap-1 shrink-0">
            <ChevronRight className="h-3 w-3 shrink-0" />
            {isLast ? (
              <span className="text-foreground font-medium truncate max-w-[160px]">
                {label}
              </span>
            ) : (
              <Link
                href={seg.href}
                className="hover:text-foreground transition-colors truncate max-w-[160px]"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
