'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { WorkspaceDashboard } from '@/components/workspace/workspace-dashboard';
import { ProjectsHub } from '@/components/dashboard/projects/projects-hub';

export default function DashboardWorkspacePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasProject = searchParams.has('project');

  // Redirect to home if no project and we're on the base dashboard route
  useEffect(() => {
    if (!hasProject && typeof window !== 'undefined') {
      // Check if we're not already on /dashboard/home
      if (!window.location.pathname.includes('/dashboard/home')) {
        router.replace('/dashboard/home');
      }
    }
  }, [hasProject, router]);

  if (!hasProject) {
    return (
      <Suspense
        fallback={
          <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background" />
        }
      >
        <ProjectsHub />
      </Suspense>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background" />
      }
    >
      <WorkspaceDashboard />
    </Suspense>
  );
}
