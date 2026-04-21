'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useSessionStore } from '@/store/session-store';
import { WorkspaceTopbar } from '@/components/workspace/workspace-topbar';
import {
  WorkspaceIconSidebar,
  type WorkspaceLeftView,
  type WorkspaceRightTab,
} from '@/components/workspace/workspace-icon-sidebar';
import { WorkspaceFileTree } from '@/components/workspace/workspace-file-tree';
import { WorkspaceEditor } from '@/components/workspace/workspace-editor';
import { WorkspaceRightPanel } from '@/components/workspace/workspace-right-panel';

export function WorkspaceDashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSessionStore();

  const [leftView, setLeftView] = useState<WorkspaceLeftView>('explorer');
  const [rightTab, setRightTab] = useState<WorkspaceRightTab>('chat');
  const [rightCollapsed, setRightCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--ds-green)' }}
        />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="h-screen w-screen overflow-hidden bg-background text-foreground">
      <WorkspaceTopbar projectName="workspace" branchName="main" unsavedCount={0} />

      <div className="h-[calc(100vh-44px)] flex min-w-0">
        <WorkspaceIconSidebar
          leftView={leftView}
          onLeftViewChange={setLeftView}
          onRightTabChange={(tab) => {
            setRightCollapsed(false);
            setRightTab(tab);
          }}
        />

        <WorkspaceFileTree view={leftView} onSelectFile={() => {}} />

        <WorkspaceEditor />

        <WorkspaceRightPanel
          activeTab={rightTab}
          onTabChange={setRightTab}
          collapsed={rightCollapsed}
          onToggleCollapsed={() => setRightCollapsed((v) => !v)}
        />
      </div>
    </div>
  );
}

