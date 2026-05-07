'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import { createProjectFromGeneration } from '@/lib/projects/create-project';
import { toast } from 'sonner';
import { DashboardSidebar } from '@/components/dashboard/shell/dashboard-sidebar';
import { DashboardMobileDrawer } from '@/components/dashboard/shell/dashboard-mobile-drawer';
import { DashboardComposerCard } from '@/components/dashboard/shell/dashboard-composer-card';
import { DashboardTopRight } from '@/components/dashboard/shell/dashboard-top-right';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';

export function DashboardHome() {
  const router = useRouter();
  const {
    recentChats,
    recentProjects,
    openMobileNav,
    setOpenMobileNav,
    openCommandPalette,
    setOpenCommandPalette,
    sidebarCollapsed,
    toggleSidebar,
    onNewChatClick,
  } = useDashboardShell();

  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);

  const activeHref = '/dashboard';

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
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-text)] flex">
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--app-panel)] focus:text-[var(--app-text)]"
      >
        Skip to content
      </a>

      <DashboardSidebar
        activeHref={activeHref}
        recentChats={recentChats}
        recentProjects={recentProjects}
        onNewChatClick={onNewChatClick}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
      />

      <div className="md:hidden fixed inset-x-0 top-0 h-14 bg-[var(--app-bg)] z-40 flex items-center px-3 gap-2 border-b border-[var(--app-border)]">
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

      <main id="dashboard-main-content" className="flex-1 min-w-0">
        <div className="hidden md:flex h-14 items-center justify-end px-6 border-b border-[var(--app-border)]">
          <DashboardTopRight />
        </div>

        <div className="pt-14 md:pt-0 min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
          <DashboardComposerCard
            prompt={prompt}
            onPromptChange={setPrompt}
            onSubmit={onCreate}
            submitting={creating}
            onBuyCredits={() => router.push('/dashboard/pricing')}
          />
        </div>
      </main>

      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />
    </div>
  );
}
