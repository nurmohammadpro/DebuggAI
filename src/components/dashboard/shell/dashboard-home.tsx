'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';
import { supabase } from '@/lib/supabase';
import { createProjectFromGeneration } from '@/lib/projects/create-project';
import { toast } from 'sonner';
import { DashboardSidebar } from '@/components/dashboard/shell/dashboard-sidebar';
import { DashboardMobileDrawer } from '@/components/dashboard/shell/dashboard-mobile-drawer';
import { DashboardComposerCard } from '@/components/dashboard/shell/dashboard-composer-card';
import { DashboardTopRight } from '@/components/dashboard/shell/dashboard-top-right';
import { readSidebarPrefs, writeSidebarPrefs } from '@/lib/dashboard/sidebar-prefs';

export function DashboardHome() {
  const router = useRouter();
  const { data: projects = [] } = useMyProjects(25, true);
  const { data: chats = [] } = useMyDebugSessions(25, true);

  const [openMobileNav, setOpenMobileNav] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarPrefs().collapsed);

  const activeHref = '/dashboard';

  const recentProjects = useMemo(() => projects.slice(0, 8), [projects]);
  const recentChats = useMemo(() => chats.slice(0, 10), [chats]);

  const onNewChatClick = () => {
    const el = document.querySelector<HTMLTextAreaElement>('textarea[data-dashboard-composer]');
    el?.focus();
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isB = e.key.toLowerCase() === 'b';
      if (!isB) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setSidebarCollapsed((v) => {
        const next = !v;
        const prefs = readSidebarPrefs();
        writeSidebarPrefs({ ...prefs, collapsed: next });
        return next;
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const onCreate = async () => {
    if (!prompt.trim()) return;
    setCreating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in again');
        return;
      }

      const name = prompt.trim().slice(0, 60);
      const { id } = await createProjectFromGeneration({
        userId: session.user.id,
        name: name || 'New Project',
        stack: 'mern',
        prompt,
        createdFrom: 'dashboard-home',
      });

      router.push(`/dashboard?project=${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <DashboardSidebar
        activeHref={activeHref}
        recentChats={recentChats}
        recentProjects={recentProjects}
        onNewChatClick={onNewChatClick}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() =>
          setSidebarCollapsed((v) => {
            const next = !v;
            const prefs = readSidebarPrefs();
            writeSidebarPrefs({ ...prefs, collapsed: next });
            return next;
          })
        }
      />

      <div className="md:hidden fixed inset-x-0 top-0 h-12 border-b border-border/40 bg-background z-40 flex items-center px-3 gap-2">
        <DashboardMobileDrawer
          open={openMobileNav}
          onOpenChange={setOpenMobileNav}
          onNewChatClick={onNewChatClick}
          activeHref={activeHref}
          recentChats={recentChats}
          recentProjects={recentProjects}
        />

        <div className="flex items-center gap-2" />

        <div className="ml-auto flex items-center gap-2">
          <DashboardTopRight />
        </div>
      </div>

      <main className="flex-1 min-w-0">
        <div className="hidden md:flex h-12 items-center justify-end px-5">
          <DashboardTopRight />
        </div>

        <div className="pt-12 md:pt-0 min-h-[calc(100vh-3rem)] flex items-center justify-center px-4">
          <DashboardComposerCard
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={onCreate}
            submitting={creating}
            onBuyCredits={() => router.push('/dashboard/pricing')}
          />
        </div>
      </main>
    </div>
  );
}
