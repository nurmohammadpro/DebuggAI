'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';
import { readSidebarPrefs, writeSidebarPrefs } from '@/lib/dashboard/sidebar-prefs';

export function useDashboardShell() {
  const pathname = usePathname();
  const { data: projects = [] } = useMyProjects(25, true);
  const { data: chats = [] } = useMyDebugSessions(25, true);

  const [openMobileNav, setOpenMobileNav] = useState(false);
  const [openCommandPalette, setOpenCommandPalette] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => readSidebarPrefs().collapsed,
  );

  const recentProjects = useMemo(() => projects.slice(0, 8), [projects]);
  const recentChats = useMemo(() => chats.slice(0, 10), [chats]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((v) => {
      const next = !v;
      const prefs = readSidebarPrefs();
      writeSidebarPrefs({ ...prefs, collapsed: next });
      return next;
    });
  }, []);

  const onNewChatClick = useCallback(() => {
    const el = document.querySelector<HTMLTextAreaElement>(
      'textarea[data-dashboard-composer]',
    );
    el?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      if (e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpenCommandPalette((v) => !v);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  return {
    pathname,
    projects,
    chats,
    recentProjects,
    recentChats,
    openMobileNav,
    setOpenMobileNav,
    openCommandPalette,
    setOpenCommandPalette,
    sidebarCollapsed,
    toggleSidebar,
    onNewChatClick,
  };
}
