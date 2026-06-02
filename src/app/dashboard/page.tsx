'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { WorkspaceDashboard } from '@/components/workspace/workspace-dashboard';
import { ProjectsHub } from '@/components/dashboard/projects/projects-hub';

export default function DashboardWorkspacePage() {
  const searchParams = useSearchParams();
  const hasProject = searchParams.has('project');

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
