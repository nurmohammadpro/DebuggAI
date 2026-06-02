'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

import { useSessionStore } from '@/store/session-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { useProject } from '@/hooks/queries/use-project';
import { useGenerationStore } from '@/store/generation-store';
import { getProjectKey } from '@/lib/project/project-key';
import { WorkspaceSplitter } from '@/components/workspace/workspace-splitter';
import { WorkspaceMobileTabs } from '@/components/workspace/workspace-mobile-tabs';
import { toast } from 'sonner';
import { EnhancedChatPanel } from '@/components/web-builder/enhanced-chat-panel';
import { V0Sidebar } from '@/components/workspace/v0-sidebar';
import { V0RightPanel } from '@/components/workspace/v0-right-panel';
import type { V0RightView } from '@/components/workspace/v0-right-panel';
import { Panel } from '@/components/panel/panel';
import { Menu, MoreVertical, PanelRight } from 'lucide-react';
import { WorkspaceSaveVersionButton } from '@/components/workspace/workspace-save-version-button';
import { DeployModal } from '@/components/workspace/deploy-modal';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { useCursorTracking, CollabCursorOverlay, CollabStatusBar } from '@/components/workspace/collab-cursors';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function WorkspaceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useSessionStore();
  const { selectedProjectId, setSelectedProjectId, setProjectKey } = useWorkspaceStore();
  const { loadFromProject, bumpPreviewNonce, files, setThreadId, setProjectId, clearThread } = useGenerationStore();
  const { recentThreads, recentProjects, openCommandPalette, setOpenCommandPalette } = useDashboardShell();

  const [rightView, setRightView] = useState<V0RightView>('code');
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
    if (effectiveProjectId) setProjectId(effectiveProjectId);
  }, [effectiveProjectId, setProjectId]);

  useEffect(() => {
    if (!effectiveProjectId) return;
    if (urlThreadId) return;
    clearThread();
  }, [clearThread, effectiveProjectId, urlThreadId]);

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
    setRightView('code');
  }, []);

  useEffect(() => {
    try {
      const savedRight = window.localStorage.getItem('debuggai.workspace.rightWidth');
      if (savedRight) setRightWidth(Number(savedRight));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('debuggai.workspace.rightWidth', String(rightWidth));
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
    setRightView('preview');
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

  const projectName = project?.description || project?.prompt || 'Untitled Project';

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
        projectName={projectName}
      />

      {/* v0-style sidebar — 48px dark icon rail */}
      <V0Sidebar />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Thin top bar — project name + collab status + mobile menu */}
        <div className="h-10 flex items-center gap-2 px-4 shrink-0 bg-[var(--app-panel)] border-b border-[var(--app-border)]">
          <button
            className="md:hidden w-7 h-7 flex items-center justify-center rounded-[6px] text-[var(--app-text-muted)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface)] transition-all shrink-0"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>

          <span className="text-[12px] font-semibold text-[var(--app-text)] truncate">
            {projectName}
          </span>

          <span className="inline-flex rounded-[5px] bg-[var(--app-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--app-text-muted)] hidden sm:inline-flex">
            builder
          </span>

          <div className="flex-1" />

          <div className="hidden sm:block">
            <CollabStatusBar cursors={remoteCursors} />
          </div>

          <WorkspaceSaveVersionButton className="hidden" ref={saveButtonRef} />

          {/* Mobile actions dropdown */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="h-7 w-7 rounded-[6px] border border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)] transition-colors inline-flex items-center justify-center text-[var(--app-text-muted)]"
                  aria-label="More actions"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)] text-[var(--app-text)]">
                <DropdownMenuLabel className="px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleRun} className="cursor-pointer">
                  Run Preview
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeployModalOpen(true)} className="cursor-pointer">
                  Deploy
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                  Share
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <button
            className="sm:hidden h-7 w-7 rounded-[6px] border border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)] transition-colors inline-flex items-center justify-center text-[var(--app-text-muted)]"
            onClick={() => setMobilePanelOpen(true)}
            aria-label="Open panels"
          >
            <PanelRight className="h-4 w-4" />
          </button>
        </div>

        {/* IDE Workspace — 3-column: chat | splitter | right panel */}
        <div className="flex-1 min-h-0 flex min-w-0">
          {/* Center: Chat surface */}
          <section className="flex-1 min-w-[300px] bg-[var(--app-bg)] flex flex-col min-h-0">
            <EnhancedChatPanel
              chromeless
              mode="build"
              className="flex-1 min-h-0 rounded-none border-0 bg-transparent"
            />
          </section>

          {/* Splitter */}
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

          {/* Right panel — desktop */}
          <Panel
            id="workspace-right"
            side="right"
            defaultWidth={clamp(rightWidth, 420, 1400)}
            minWidth={420}
            collapsed={rightCollapsed}
            onToggleCollapsed={() => setRightCollapsed((v) => !v)}
            className="hidden sm:flex transition-all duration-200 ease-out"
          >
            <V0RightPanel
              activeView={rightView}
              onViewChange={setRightView}
              collapsed={rightCollapsed}
              onToggleCollapsed={() => setRightCollapsed((v) => !v)}
              onRun={handleRun}
              onDeploy={() => setDeployModalOpen(true)}
              onShare={handleShare}
              onSave={() => saveButtonRef.current?.click()}
            />
          </Panel>

          {/* Right panel — mobile overlay */}
          <Panel
            id="workspace-right-mobile"
            side="right"
            mobile
            mobileOpen={mobilePanelOpen}
            onMobileClose={() => setMobilePanelOpen(false)}
          >
            <V0RightPanel
              activeView={rightView}
              onViewChange={setRightView}
              onRun={handleRun}
              onDeploy={() => setDeployModalOpen(true)}
              onShare={handleShare}
            />
          </Panel>
        </div>

        {/* Mobile Bottom Tabs */}
        <WorkspaceMobileTabs
          activeTab={rightView}
          onTabChange={(tab) => {
            setRightCollapsed(false);
            setRightView(tab as V0RightView);
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
