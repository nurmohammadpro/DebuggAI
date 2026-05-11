'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { createProjectFromGeneration } from '@/lib/projects/create-project';
import { toast } from 'sonner';
import { DashboardSidebar } from '@/components/dashboard/home/dashboard-sidebar';
import { DashboardComposerCard } from '@/components/dashboard/home/dashboard-composer-card';
import { DashboardTopRight } from '@/components/dashboard/home/dashboard-top-right';
import { DashboardStatsGrid } from '@/components/dashboard/home/dashboard-stats-grid';
import { DashboardDebugIssues } from '@/components/dashboard/home/dashboard-debug-issues';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';

export function ClientDashboardHome() {
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
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      <a
        href="#dashboard-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--bg-secondary)] focus:text-[var(--text-primary)]"
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

      <main id="dashboard-main-content" className="flex-1 min-w-0 overflow-y-auto">
        {/* Header */}
        <div className="h-14 border-b border-[var(--border-default)] flex items-center justify-end px-4 bg-[var(--bg-secondary)]">
          <DashboardTopRight />
        </div>

        {/* Dashboard Content */}
        <div className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1">
              Dashboard
            </h1>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Overview of your projects and debug sessions
            </p>
          </div>

          {/* Stats Grid */}
          <DashboardStatsGrid />

          {/* Debug Issues Section */}
          <div className="mt-8">
            <DashboardDebugIssues />
          </div>

          {/* Quick Create */}
          <div className="mt-8 max-w-2xl">
            <DashboardComposerCard
              prompt={prompt}
              onPromptChange={setPrompt}
              onSubmit={onCreate}
              submitting={creating}
              onBuyCredits={() => router.push('/dashboard/pricing')}
            />
          </div>
        </div>
      </main>

      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />
    </div>
  );
}
