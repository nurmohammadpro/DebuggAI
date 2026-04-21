import { Suspense } from 'react';
import { WorkspaceDashboard } from '@/components/workspace/workspace-dashboard';

export default function DashboardWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-screen flex items-center justify-center bg-background" />
      }
    >
      <WorkspaceDashboard />
    </Suspense>
  );
}
