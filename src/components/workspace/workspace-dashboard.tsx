'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

import { useSessionStore } from '@/store/session-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useProject } from '@/hooks/queries/use-project';
import { useGenerationStore } from '@/store/generation-store';
import { getProjectKey } from '@/lib/project/project-key';
import { WorkspaceRightPanel } from '@/components/workspace/workspace-right-panel';
import { WorkspaceSplitter } from '@/components/workspace/workspace-splitter';
import { WorkspaceMobileTabs } from '@/components/workspace/workspace-mobile-tabs';
import { toast } from 'sonner';
import { UnifiedHeader } from '@/components/dashboard/sidebar/unified-header';
import { UnifiedSidebar } from '@/components/dashboard/sidebar/unified-sidebar';
import { EnhancedChatPanel } from '@/components/web-builder/enhanced-chat-panel';
import { Panel } from '@/components/panel/panel';
import { Menu, MoreVertical, PanelRight, Play, Rocket, Save, Share2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';
import { WorkspaceSaveVersionButton } from '@/components/workspace/workspace-save-version-button';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { DeployModal } from '@/components/workspace/deploy-modal';
import type { WorkspaceRightTab } from '@/components/workspace/workspace-right-panel';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { useCursorTracking, CollabCursorOverlay, CollabStatusBar } from '@/components/workspace/collab-cursors';
import { useShellStore } from '@/store/shell-store';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function WorkspaceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useSessionStore();
  const { selectedProjectId, setSelectedProjectId, setProjectKey } = useWorkspaceStore();
  const { loadFromProject, bumpPreviewNonce, files, setThreadId } = useGenerationStore();
  const { recentThreads, recentProjects, openCommandPalette, setOpenCommandPalette } = useDashboardShell();
  const { sidebarCollapsed, toggleSidebar } = useShellStore();

  const [rightTab, setRightTab] = useState<WorkspaceRightTab>('code');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rightWidth, setRightWidth] = useState(980);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const projectBootStartedAtRef = useRef<number | null>(null);
  const projectBootLoggedRef = useRef<string | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);

  const urlProjectId = searchParams.get('project');
  const urlThreadId = searchParams.get('thread');
  const effectiveProjectId = urlProjectId;
  const { data: project } = useProject(effectiveProjectId, !!effectiveProjectId);

  const { remoteCursors, broadcastCursor } = useCursorTracking(effectiveProjectId || '', !!effectiveProjectId);

  useEffect(() => {
    if (urlProjectId && urlProjectId !== selectedProjectId) {
      setSelectedProjectId(urlProjectId);
    }
  }, [selectedProjectId, setSelectedProjectId, urlProjectId]);

  useEffect(() => {
    if (!effectiveProjectId) return;
    if (projectBootLoggedRef.current === effectiveProjectId) return;
    projectBootStartedAtRef.current = performance.now();
  }, [effectiveProjectId]);

  useEffect(() => {
    if (urlThreadId) setThreadId(urlThreadId);
  }, [setThreadId, urlThreadId]);

  useEffect(() => {
    if (project?.code) {
      loadFromProject(project.code, project.description || 'Loaded project');
      if (
        effectiveProjectId &&
        projectBootLoggedRef.current !== effectiveProjectId &&
        projectBootStartedAtRef.current != null
      ) {
        const elapsed = Math.round(performance.now() - projectBootStartedAtRef.current);
        console.info('[workspace] project boot duration (ms)', {
          projectId: effectiveProjectId,
          elapsed,
        });
        projectBootLoggedRef.current = effectiveProjectId;
      }
    }
  }, [effectiveProjectId, loadFromProject, project?.code, project?.description]);

  useEffect(() => {
    if (!project) return;
    setProjectKey(getProjectKey(project));
  }, [project, setProjectKey]);

  useEffect(() => {
    setRightCollapsed(false);
    setRightTab('code');
  }, []);

  useEffect(() => {
    try {
      const savedRight = window.localStorage.getItem(
        'debuggai.workspace.rightWidth'
      );
      if (savedRight) setRightWidth(Number(savedRight));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'debuggai.workspace.rightWidth',
        String(rightWidth)
      );
    } catch {
      // ignore
    }
  }, [rightWidth]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--accent)' }}
        />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!effectiveProjectId) {
    return null;
  }

  const handleRun = () => {
    setRightTab('preview');
    setRightCollapsed(false);
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
      <WorkspaceSaveVersionButton className="hidden" ref={saveButtonRef} />

      {/* Credits Display */}
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-[6px] bg-[var(--app-surface)]">
        <Zap className="h-3.5 w-3.5 text-[var(--ds-green)]" />
        <span className="font-semibold text-[var(--app-text)]">
          {useSessionStore.getState().user?.credits === -1 ? '∞' : useSessionStore.getState().user?.credits ?? 0}
        </span>
        <span className="text-[var(--app-text-muted)]">credits</span>
      </div>

      <div className="hidden sm:block">
        <CollabStatusBar cursors={remoteCursors} />
      </div>

      <button
        className="hidden sm:inline-flex h-8 px-3 rounded-[6px] border border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)] transition-colors items-center gap-2 text-[11px] font-semibold uppercase tracking-tight text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
        onClick={() => setDeployModalOpen(true)}
      >
        <Rocket className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Deploy</span>
      </button>

      <WorkspaceSaveVersionButton className="hidden sm:inline-flex" />

      <button
        className="hidden sm:inline-flex h-8 px-3 rounded-[6px] border border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)] transition-colors items-center gap-2 text-[11px] font-semibold uppercase tracking-tight text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
        onClick={handleShare}
      >
        <Share2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Share</span>
      </button>

      <Button
        variant="green"
        size="sm"
        className="hidden sm:inline-flex h-8 px-3 text-[11px] font-semibold uppercase tracking-tight"
        onClick={handleRun}
      >
        <Play className="h-3.5 w-3.5" />
        <span>Run</span>
      </Button>

      <button
        className="sm:hidden h-8 w-8 rounded-[6px] border border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)] transition-colors inline-flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
        onClick={() => setMobilePanelOpen(true)}
        aria-label="Open panels"
      >
        <PanelRight className="h-4 w-4" />
      </button>

      <div className="sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="h-8 w-8 rounded-[6px] border border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)] transition-colors inline-flex items-center justify-center text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
              aria-label="More actions"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)]">
            <DropdownMenuLabel className="px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setDeployModalOpen(true)} className="cursor-pointer">
              <Rocket className="h-4 w-4" />
              Deploy
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => saveButtonRef.current?.click()}
              className="cursor-pointer"
            >
              <Save className="h-4 w-4" />
              Save version
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
              <Share2 className="h-4 w-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleRun} className="cursor-pointer">
              <Play className="h-4 w-4" />
              Run preview
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <WorkspaceAccountMenu />
    </>
  );

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)] flex">
      <CollabCursorOverlay cursors={remoteCursors} />
      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />

      <DeployModal
        open={deployModalOpen}
        onOpenChange={setDeployModalOpen}
        projectId={effectiveProjectId}
        projectFiles={files?.files ? Object.fromEntries(
          Object.entries(files.files).map(([path, f]) => [path, f.content])
        ) : {}}
        projectName={project?.prompt || project?.description || 'my-app'}
      />

      {/* Sidebar — mobile overlay handled internally by UnifiedSidebar via Panel */}
      <UnifiedSidebar
        recentThreads={recentThreads}
        recentProjects={recentProjects}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        <UnifiedHeader
          title={project?.description || project?.prompt || 'Untitled Project'}
          subtitle={effectiveProjectId}
          titleBadge={
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex rounded-[6px] bg-[var(--app-panel-2)] px-2 py-0.5 text-[10px] font-semibold text-[var(--app-text)]">
                Web Builder
              </span>
            </div>
          }
          actions={headerActions}
          showHelp={false}
          showAccountMenu={false}
          mobileMenuButton={
            <button
              className="md:hidden w-8 h-8 flex items-center justify-center rounded-[6px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          }
        />

        {/* IDE Workspace */}
        <div className="flex-1 min-h-0 flex min-w-0">
          {/* Primary conversation surface */}
          <section className="flex-1 min-w-[300px] bg-[var(--app-bg)] flex flex-col min-h-0">
            <EnhancedChatPanel
              chromeless
              mode="build"
              className="flex-1 min-h-0 rounded-none border-0 bg-transparent"
            />
          </section>

          {/* Splitter — hidden when right panel is collapsed or on mobile */}
          {!rightCollapsed && (
            <div className="hidden sm:block">
              <WorkspaceSplitter
                ariaLabel="Resize right panel"
                onResize={(dx) =>
                  setRightWidth((w) => clamp(w - dx, 420, 1400))
                }
              />
            </div>
          )}

          {/* Right panel — desktop (Panel handles collapsed state) */}
          <Panel
            id="workspace-right"
            side="right"
            defaultWidth={clamp(rightWidth, 420, 1400)}
            minWidth={420}
            collapsed={rightCollapsed}
            onToggleCollapsed={() => setRightCollapsed((v) => !v)}
            className="hidden sm:flex transition-all duration-200 ease-out"
          >
            <WorkspaceRightPanel
              activeTab={rightTab}
              onTabChange={setRightTab}
              width={clamp(rightWidth, 420, 1400)}
              onToggleCollapsed={() => setRightCollapsed((v) => !v)}
              onEditorViewChange={(view) => {
                setRightTab(view);
              }}
            />
          </Panel>

          {/* Right panel — mobile overlay (Panel handles the animated drawer) */}
          <Panel
            id="workspace-right-mobile"
            side="right"
            mobile
            mobileOpen={mobilePanelOpen}
            onMobileClose={() => setMobilePanelOpen(false)}
          >
            <WorkspaceRightPanel
              activeTab={rightTab}
              onTabChange={setRightTab}
              width={0}
              mobile
              onMobileClose={() => setMobilePanelOpen(false)}
              onEditorViewChange={(view) => {
                setRightTab(view);
              }}
            />
          </Panel>
        </div>

        {/* Mobile Bottom Tabs */}
        <WorkspaceMobileTabs
          activeTab={rightTab}
          onTabChange={(tab) => {
            setRightCollapsed(false);
            setRightTab(tab);
            setMobilePanelOpen(true);
          }}
        />
      </main>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
