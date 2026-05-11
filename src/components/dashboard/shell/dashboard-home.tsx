'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabase';
import { createProjectFromGeneration } from '@/lib/projects/create-project';
import { toast } from 'sonner';
import { DashboardComposerCard } from '@/components/dashboard/home/dashboard-composer-card';
import { DashboardStatsGrid } from '@/components/dashboard/home/dashboard-stats-grid';
import { DashboardDebugIssues } from '@/components/dashboard/home/dashboard-debug-issues';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';
import { UnifiedLayout } from '@/components/dashboard/sidebar/unified-layout';

export function DashboardHome() {
  const router = useRouter();
  const {
    recentChats,
    recentProjects,
    openCommandPalette,
    setOpenCommandPalette,
    onNewChatClick,
  } = useDashboardShell();

  const [prompt, setPrompt] = useState('');
  const [creating, setCreating] = useState(false);

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
    <UnifiedLayout title="Dashboard" subtitle="Overview of your projects and debug sessions">
      <div className="p-8">
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

      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />
    </UnifiedLayout>
  );
}
