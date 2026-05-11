'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

import { useSessionStore } from '@/store/session-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useProject } from '@/hooks/queries/use-project';
import { useGenerationStore } from '@/store/generation-store';
import { useMemo } from 'react';
import { getProjectKey } from '@/lib/project/project-key';
import {
  WorkspaceIconSidebar,
  type WorkspaceLeftView,
  type WorkspaceRightTab,
} from '@/components/workspace/workspace-icon-sidebar';
import { WorkspaceFileTree } from '@/components/workspace/workspace-file-tree';
import { WorkspaceEditor } from '@/components/workspace/workspace-editor';
import type { EditorView } from '@/components/workspace/workspace-editor';
import { WorkspaceRightPanel } from '@/components/workspace/workspace-right-panel';
import { WorkspaceSplitter } from '@/components/workspace/workspace-splitter';
import { toast } from 'sonner';
import { UnifiedHeader } from '@/components/dashboard/sidebar/unified-header';
import { UnifiedSidebar } from '@/components/dashboard/sidebar/unified-sidebar';
import { Play, Share2, Zap } from 'lucide-react';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import { WorkspaceSaveVersionButton } from '@/components/workspace/workspace-save-version-button';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';

export function WorkspaceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useSessionStore();
  const { selectedProjectId, setSelectedProjectId, setProjectKey } = useWorkspaceStore();
  const { loadFromProject, bumpPreviewNonce, getProjectCode, savedSnapshot, currentCode, files } = useGenerationStore();
  const { recentChats, recentProjects } = useDashboardShell();

  const [leftView, setLeftView] = useState<WorkspaceLeftView>('explorer');
  const [rightTab, setRightTab] = useState<WorkspaceRightTab>('chat');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [explorerWidth, setExplorerWidth] = useState(288);
  const [rightWidth, setRightWidth] = useState(420);
  const [editorView, setEditorView] = useState<EditorView>('code');

  const urlProjectId = searchParams.get('project');
  const effectiveProjectId = urlProjectId;
  const { data: project } = useProject(effectiveProjectId, !!effectiveProjectId);

  const unsavedCount = useMemo(() => {
    const currentSnapshot = getProjectCode();
    const a = (savedSnapshot || '').trim();
    const b = (currentSnapshot || '').trim();
    return a && b && a !== b ? 1 : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCode, files, savedSnapshot]);

  useEffect(() => {
    if (urlProjectId && urlProjectId !== selectedProjectId) {
      setSelectedProjectId(urlProjectId);
    }
  }, [selectedProjectId, setSelectedProjectId, urlProjectId]);

  useEffect(() => {
    if (project?.code) {
      loadFromProject(project.code, project.description || 'Loaded project');
    }
  }, [loadFromProject, project?.code, project?.description]);

  useEffect(() => {
    if (!project) return;
    setProjectKey(getProjectKey(project));
  }, [project, setProjectKey]);

  useEffect(() => {
    // Default right panel to chat
    setRightCollapsed(false);
    setRightTab('chat');
  }, []);

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
          style={{ borderColor: 'var(--accent)' }}
        />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  // If no project, show DashboardHome (handled by the caller)
  if (!effectiveProjectId) {
    return null;
  }

  const handleRun = () => {
    setEditorView('preview');
    bumpPreviewNonce();
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/dashboard?project=${effectiveProjectId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.message(url);
    }
  };

  const headerActions = (
    <>
      {/* Credits Display */}
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border-default)]">
        <Zap className="h-3.5 w-3.5" style={{ color: 'var(--accent)' }} />
        <span className="font-semibold text-[var(--text-primary)]">
          {useSessionStore.getState().user?.credits === -1 ? '∞' : useSessionStore.getState().user?.credits ?? 0}
        </span>
        <span className="text-[var(--text-secondary)]">credits</span>
      </div>

      {/* Save Version */}
      <WorkspaceSaveVersionButton />

      {/* Share Button */}
      <button
        className="h-8 px-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-transparent hover:bg-[var(--bg-tertiary)] transition-colors inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tight text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        onClick={handleShare}
      >
        <Share2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Share</span>
      </button>

      {/* Run Button */}
      <button
        className="h-8 px-3 rounded-[var(--radius-md)] bg-[var(--accent)] text-white hover:opacity-90 transition inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tight"
        onClick={handleRun}
      >
        <Play className="h-3.5 w-3.5" />
        <span>Run</span>
      </button>

      {/* Account Menu */}
      <WorkspaceAccountMenu />
    </>
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* Unified Sidebar */}
      <UnifiedSidebar
        recentChats={recentChats}
        recentProjects={recentProjects}
        collapsed={false}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Unified Header */}
        <UnifiedHeader
          title={project?.description || project?.prompt || 'Untitled Project'}
          subtitle={effectiveProjectId}
          actions={headerActions}
        />

        {/* IDE Workspace */}
        <div className="flex-1 min-h-0 flex min-w-0">
          {/* Icon Sidebar */}
          <div className="w-12 shrink-0 border-r border-[var(--border-default)] bg-[var(--bg-secondary)]">
            <WorkspaceIconSidebar
              leftView={leftView}
              onLeftViewChange={setLeftView}
              onRightTabChange={(tab) => {
                setRightCollapsed(false);
                setRightTab(tab);
              }}
            />
          </div>

          {/* File Tree */}
          <WorkspaceFileTree
            view={leftView}
            width={clamp(explorerWidth, 220, 520)}
          />

          {/* Splitter */}
          <WorkspaceSplitter
            ariaLabel="Resize explorer"
            onResize={(dx) => setExplorerWidth((w) => clamp(w + dx, 220, 520))}
          />

          {/* Editor */}
          <WorkspaceEditor editorView={editorView} onEditorViewChange={setEditorView} />

          {/* Splitter */}
          <WorkspaceSplitter
            ariaLabel="Resize right panel"
            onResize={(dx) =>
              setRightWidth((w) => clamp(w - dx, 320, 720))
            }
          />

          {/* Right Panel */}
          <WorkspaceRightPanel
            activeTab={rightTab}
            onTabChange={setRightTab}
            collapsed={rightCollapsed}
            onToggleCollapsed={() => setRightCollapsed((v) => !v)}
            width={clamp(rightWidth, 320, 720)}
            mode={mode}
          />
        </div>
      </main>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
