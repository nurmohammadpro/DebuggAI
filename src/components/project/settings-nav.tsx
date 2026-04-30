/**
 * Project Settings Navigation
 *
 * Enterprise-grade settings navigation similar to v0.dev
 * Manages project configuration, deployment, integrations, and collaboration
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Settings,
  Globe,
  Variable,
  Plug,
  GitBranch,
  Users,
  BarChart3,
  Zap,
  Lock,
  Eye,
  Crown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsNavProps {
  projectId: string;
}

export function SettingsNav({ projectId }: SettingsNavProps) {
  const pathname = usePathname();

  const settingsSections = [
    {
      category: 'General',
      items: [
        {
          name: 'General',
          href: `/dashboard/projects/${projectId}/settings`,
          icon: Settings,
          description: 'Basic project settings and configuration',
        },
        {
          name: 'Domains',
          href: `/dashboard/projects/${projectId}/settings/domains`,
          icon: Globe,
          description: 'Custom domains and SSL certificates',
        },
        {
          name: 'Environment Variables',
          href: `/dashboard/projects/${projectId}/settings/env-vars`,
          icon: Variable,
          description: 'Runtime configuration and secrets',
        },
      ],
    },
    {
      category: 'Integrations',
      items: [
        {
          name: 'Integrations',
          href: `/dashboard/projects/${projectId}/settings/integrations`,
          icon: Plug,
          description: 'Third-party service connections',
        },
        {
          name: 'Git',
          href: `/dashboard/projects/${projectId}/settings/git`,
          icon: GitBranch,
          description: 'Version control and deployment',
        },
      ],
    },
    {
      category: 'Collaboration',
      items: [
        {
          name: 'Collaborators',
          href: `/dashboard/projects/${projectId}/settings/collaborators`,
          icon: Users,
          description: 'Team members and permissions',
        },
        {
          name: 'Visibility',
          href: `/dashboard/projects/${projectId}/settings/visibility`,
          icon: Eye,
          description: 'Project access and visibility controls',
        },
      ],
    },
    {
      category: 'Advanced',
      items: [
        {
          name: 'Analytics',
          href: `/dashboard/projects/${projectId}/settings/analytics`,
          icon: BarChart3,
          description: 'Usage metrics and performance data',
        },
        {
          name: 'Performance',
          href: `/dashboard/projects/${projectId}/settings/performance`,
          icon: Zap,
          description: 'Optimization and caching settings',
        },
        {
          name: 'Security',
          href: `/dashboard/projects/${projectId}/settings/security`,
          icon: Lock,
          description: 'Security policies and compliance',
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col w-64 border-r bg-card">
      <div className="p-4 border-b">
        <h2 className="text-sm font-semibold text-foreground">Project Settings</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Configure your project
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4">
        {settingsSections.map((section) => (
          <div key={section.category} className="mb-6">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              {section.category}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'flex items-start gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{item.name}</div>
                      <div
                        className={cn(
                          'text-xs truncate',
                          isActive
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        )}
                      >
                        {item.description}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Pro Badge */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
          <Crown className="w-4 h-4 text-primary" />
          <div className="flex-1">
            <div className="text-xs font-medium text-foreground">
              Upgrade to Pro
            </div>
            <div className="text-xs text-muted-foreground">
              Unlock all features
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
