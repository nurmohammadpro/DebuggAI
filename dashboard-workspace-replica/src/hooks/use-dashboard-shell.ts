'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { useMyThreads } from '@/hooks/queries/use-my-threads';
import { useShellStore } from '@/store/shell-store';

export function useDashboardShell() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: projects = [] } = useMyProjects(25, true);
  const projectId = searchParams.get('project');
  const { data: threads = [] } = useMyThreads(25, true, projectId);

  const [openMobileNav, setOpenMobileNav] = useState(false);
  const [openCommandPalette, setOpenCommandPalette] = useState(false);
  
  const { sidebarCollapsed, toggleSidebar } = useShellStore();

  const recentProjects = useMemo(() => projects.slice(0, 8), [projects]);
  const recentThreads = useMemo(() => threads.slice(0, 10), [threads]);

  const onNewChatClick = useCallback(() => {
    const el = document.querySelector<HTMLTextAreaElement>(
      'textarea[data-dashboard-composer]',
    );
    el?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;

      if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpenCommandPalette((v) => !v);
        return;
      }

      if (mod && !shift && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        onNewChatClick();
        return;
      }

      if (mod && shift && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        router.push('/dashboard/home?create=1');
        return;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar, onNewChatClick, router]);

  return {
    pathname,
    projects,
    threads,
    recentProjects,
    recentThreads,
    openMobileNav,
    setOpenMobileNav,
    openCommandPalette,
    setOpenCommandPalette,
    sidebarCollapsed,
    toggleSidebar,
    onNewChatClick,
  };
}
