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
import { WorkspaceSplitter } from '@/components/workspace/workspace-splitter';

export function WorkspaceDashboard() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useSessionStore();

  const [leftView, setLeftView] = useState<WorkspaceLeftView>('explorer');
  const [rightTab, setRightTab] = useState<WorkspaceRightTab>('chat');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [explorerWidth, setExplorerWidth] = useState(288);
  const [rightWidth, setRightWidth] = useState(420);

  useEffect(() => {
    try {
      const savedExplorer = window.localStorage.getItem(
        'debuggai.workspace.explorerWidth'
      );
      const savedRight = window.localStorage.getItem(
        'debuggai.workspace.rightWidth'
      );
      if (savedExplorer) setExplorerWidth(Number(savedExplorer));
      if (savedRight) setRightWidth(Number(savedRight));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'debuggai.workspace.explorerWidth',
        String(explorerWidth)
      );
      window.localStorage.setItem(
        'debuggai.workspace.rightWidth',
        String(rightWidth)
      );
    } catch {
      // ignore
    }
  }, [explorerWidth, rightWidth]);

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
    <div className="min-h-screen w-screen overflow-hidden bg-background text-foreground flex flex-col">
      <WorkspaceTopbar projectName="workspace" branchName="main" unsavedCount={0} />

      <div className="flex-1 min-h-0 flex min-w-0">
        <div className="w-12 shrink-0 border-r border-border/70">
          <WorkspaceIconSidebar
            leftView={leftView}
            onLeftViewChange={setLeftView}
            onRightTabChange={(tab) => {
              setRightCollapsed(false);
              setRightTab(tab);
            }}
          />
        </div>

        <WorkspaceFileTree
          view={leftView}
          onSelectFile={() => {}}
          width={clamp(explorerWidth, 220, 520)}
        />

        <WorkspaceSplitter
          ariaLabel="Resize explorer"
          onResize={(dx) => setExplorerWidth((w) => clamp(w + dx, 220, 520))}
        />

        <WorkspaceEditor />

        <WorkspaceSplitter
          ariaLabel="Resize right panel"
          onResize={(dx) =>
            setRightWidth((w) => clamp(w - dx, 320, 720))
          }
        />

        <WorkspaceRightPanel
          activeTab={rightTab}
          onTabChange={setRightTab}
          collapsed={rightCollapsed}
          onToggleCollapsed={() => setRightCollapsed((v) => !v)}
          width={clamp(rightWidth, 320, 720)}
        />
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
