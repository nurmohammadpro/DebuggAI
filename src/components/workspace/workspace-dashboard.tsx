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
import { EnhancedChatPanel } from '@/components/web-builder/enhanced-chat-panel';
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar';
import { V0RightPanel } from '@/components/workspace/v0-right-panel';
import type { V0RightView } from '@/components/workspace/v0-right-panel';
import dynamic from 'next/dynamic';
import { Panel } from '@/components/panel/panel';
import { WorkspaceSaveVersionButton } from '@/components/workspace/workspace-save-version-button';
import { ShareDialog } from '@/components/workspace/share-dialog';
import { CommandPalette } from '@/components/dashboard/command-palette';

const DeployModal = dynamic(() => import('@/components/workspace/deploy-modal').then(m => m.DeployModal), {
  loading: () => null,
});
import { useCursorTracking, CollabCursorOverlay } from '@/components/workspace/collab-cursors';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';
import { getSession } from '@/hooks/use-session';
import { BrandLockup } from '@/components/logo';
import { Menu } from 'lucide-react';

export function WorkspaceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useSessionStore();
  const { selectedProjectId, setSelectedProjectId, setProjectKey } = useWorkspaceStore();
  const { loadFromProject, bumpPreviewNonce, files, setThreadId, setProjectId, currentThreadId, reset: resetGenerationStore } = useGenerationStore();
  const { openCommandPalette, setOpenCommandPalette } = useDashboardShell();

  const [rightView, setRightView] = useState<V0RightView>('code');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [workspaceSidebarOpen, setWorkspaceSidebarOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [, setLoadingThread] = useState(false);
  const projectBootStartedAtRef = useRef<number | null>(null);
  const projectBootLoggedRef = useRef<string | null>(null);
  const threadBootedRef = useRef<string | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);

  const urlProjectId = searchParams.get('project');
  const urlThreadId = searchParams.get('thread');
  const effectiveProjectId = urlProjectId;
  const { data: project } = useProject(effectiveProjectId, !!effectiveProjectId);

  const { remoteCursors } = useCursorTracking(effectiveProjectId || '', !!effectiveProjectId);

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
    if (urlThreadId) {
      setThreadId(urlThreadId);
    } else if (effectiveProjectId && threadBootedRef.current !== effectiveProjectId) {
      // No thread in URL — find the latest thread for this project
      threadBootedRef.current = effectiveProjectId;
      setLoadingThread(true);
      (async () => {
        try {
          const { session } = await getSession();
          const token = session?.access_token;
          if (!token) return;
          const res = await fetch(
            `/api/threads?projectId=${encodeURIComponent(effectiveProjectId!)}&limit=1`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (!res.ok) return;
          const j = await res.json();
          const threads = (j?.threads || []) as Array<{ id: string }>;
          if (threads.length > 0) {
            setThreadId(threads[0]!.id);
          } else {
            // Fresh project — clear any stale thread from a previous project.
            setThreadId(null);
          }
        } catch {
          // Silently fail — chat will start fresh
        } finally {
          setLoadingThread(false);
        }
      })();
    }
  }, [setThreadId, effectiveProjectId, urlThreadId]);

  // Track the project we last booted so we can reset on switch.
  const lastBootedProjectRef = useRef<string | null>(null);

  // Load project code into generation store.
  // Also ensures currentProjectId stays in sync with the URL param.
  useEffect(() => {
    if (!effectiveProjectId) return;

    // Always keep the project ID in the store so persistence and
    // thread lookups have a project context after code loads.
    setProjectId(effectiveProjectId);

    const switched = lastBootedProjectRef.current !== effectiveProjectId;

    // When switching to a different project that truly has no saved code
    // (loaded, not loading), reset so old files / versions don't leak.
    if (switched && project !== undefined && !project?.code) {
      resetGenerationStore();
      // Re-set project ID after reset cleared it
      setProjectId(effectiveProjectId);
    }
    lastBootedProjectRef.current = effectiveProjectId;

    if (project?.code) {
      loadFromProject(project.code, project.description || 'Loaded project');
    }
  }, [effectiveProjectId, loadFromProject, project?.code, project?.description, resetGenerationStore, setProjectId]);

  // Fallback: restore files from thread messages when no saved code exists
  // Runs AFTER the thread is loaded (currentThreadId is set)
  useEffect(() => {
    if (!currentThreadId) return;
    if (project?.code) return; // Already loaded from saved code

    const generationStore = useGenerationStore.getState();
    if (generationStore.files && Object.keys(generationStore.files.files).length > 1) return; // Already has files

    (async () => {
      try {
        const { session } = await getSession();
        const token = session?.access_token;
        if (!token) return;
        const res = await fetch(`/api/threads/${currentThreadId}/messages?limit=100`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const j = await res.json();
        const msgs = (j?.messages || []) as Array<{ role: string; content: string }>;
        // Scan from last to first — find the richest assistant message with code
        for (let i = msgs.length - 1; i >= 0; i--) {
          const msg = msgs[i];
          if (msg.role !== 'assistant') continue;
          const content = String(msg.content || '');
          // Count code fences — we want the richest response
          const fenceCount = (content.match(/```/g) || []).length;
          if (fenceCount >= 4) {
            // At least 2 complete code blocks
            loadFromProject(content, project?.description || 'Restored from chat');
            return;
          }
        }
      } catch {
        // No files to restore
      }
    })();
  }, [currentThreadId, effectiveProjectId, project?.code, project?.description, loadFromProject]);

  useEffect(() => {
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
  }, [effectiveProjectId, project?.code, project?.description]);

  useEffect(() => {
    if (!project) return;
    setProjectKey(getProjectKey(project));
  }, [project, setProjectKey]);

  // Fresh project → chat-only. After AI generates files,
  // show the full layout with PREVIEW as default (v0.dev style).
  const hasGeneratedFiles = !!(files?.files &&
    Object.keys(files.files).length > 1 &&
    Object.values(files.files).some(f => f.status !== 'deleted'));
  const showOnlyChat = !hasGeneratedFiles;

  useEffect(() => {
    setRightCollapsed(showOnlyChat);
    if (hasGeneratedFiles) {
      setRightView('preview');
    }
  }, [showOnlyChat, hasGeneratedFiles]);

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

  const handleShare = () => setShareDialogOpen(true);
  const shareUrl = `${window.location.origin}/dashboard?project=${effectiveProjectId}`;

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

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        projectName={projectName}
        url={shareUrl}
      />

      {/* Workspace sidebar trigger — hidden by default, v0-style */}
      <button
        type="button"
        onClick={() => setWorkspaceSidebarOpen(true)}
        className={`fixed left-3 top-[calc(0.75rem+env(safe-area-inset-top))] z-50 inline-flex touch-target items-center gap-2 rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel)]/95 px-3 text-[12px] font-medium text-[var(--app-text)] shadow-lg shadow-black/10 backdrop-blur hover:bg-[var(--app-surface)] active:scale-[0.98] transition-all md:left-4 md:top-4 ${workspaceSidebarOpen ? 'opacity-0 pointer-events-none -translate-x-2' : 'opacity-100 translate-x-0'}`}
        aria-label="Open workspace sidebar"
        title="Open sidebar"
      >
        <BrandLockup
          className="gap-2"
          logoClassName="h-5 w-5"
          textClassName="hidden text-[12px] font-medium sm:inline"
        />
        <Menu className="h-4 w-4 text-[var(--app-text-dim)]" />
      </button>

      {/* Absolute sidebar — single left rail, hidden by default */}
      <WorkspaceSidebar
        isOpen={workspaceSidebarOpen}
        onClose={() => setWorkspaceSidebarOpen(false)}
      />

      {/* Main workspace — no top bar, v0.dev clean layout */}
      <WorkspaceSaveVersionButton className="hidden" ref={saveButtonRef} />
      <main className="flex-1 min-w-0 flex flex-col pb-[env(safe-area-inset-bottom)] sm:pb-0">
        {/* IDE Workspace: chat | preview+code */}
        <div className="flex-1 min-h-0 flex min-w-0">
          {/* Chat panel — narrow, no scrollbar-visible */}
          <section
            data-chat-panel
            className={
            showOnlyChat
              ? "flex-1 min-w-0 max-w-[720px] mx-auto bg-[var(--app-bg)] flex flex-col min-h-0 w-full"
              : "w-full sm:w-[360px] sm:min-w-[300px] sm:max-w-[420px] bg-[var(--app-bg)] flex flex-col min-h-0 sm:border-r border-[var(--app-border)]"
          }>
            <EnhancedChatPanel
              chromeless
              mode="build"
              className="flex-1 min-h-0 rounded-none border-0 bg-transparent"
            />
          </section>

          {/* Splitter */}
          {!rightCollapsed && !showOnlyChat && (
            <div className="hidden sm:block">
              <WorkspaceSplitter
                ariaLabel="Resize right panel"
                onResize={(dx) => {
                  const chat = document.querySelector('[data-chat-panel]');
                  if (chat) {
                    const current = parseFloat(getComputedStyle(chat).width);
                    const next = Math.max(260, Math.min(520, current + dx));
                    (chat as HTMLElement).style.width = `${next}px`;
                    (chat as HTMLElement).style.maxWidth = `${next}px`;
                  }
                }}
              />
            </div>
          )}

          {/* Right: preview + code (split) */}
          <Panel
            id="workspace-right"
            side="right"
            defaultWidth={0}
            minWidth={420}
            collapsed={rightCollapsed}
            onToggleCollapsed={() => setRightCollapsed((v) => !v)}
            className={`hidden sm:flex flex-1 transition-all duration-200 ease-out ${showOnlyChat ? 'hidden' : ''}`}
          >
            <V0RightPanel
              activeView={rightView}
              onViewChange={setRightView}
              collapsed={rightCollapsed}
              onToggleCollapsed={() => setRightCollapsed((v) => !v)}
              onDeploy={() => setDeployModalOpen(true)}
              onShare={handleShare}
              onSave={() => saveButtonRef.current?.click()}
            />
          </Panel>

          {/* Mobile overlay */}
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
              onDeploy={() => setDeployModalOpen(true)}
              onShare={handleShare}
            />
          </Panel>
        </div>

        {/* Mobile bottom tabs */}
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
