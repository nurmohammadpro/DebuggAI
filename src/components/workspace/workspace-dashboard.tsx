'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';

import { useWorkspaceStore } from '@/store/workspace-store';
import { useProjectBoot } from '@/hooks/queries/use-project-boot';
import { useGenerationStore } from '@/store/generation-store';
import { getProjectKey } from '@/lib/project/project-key';
import { serializeVirtualFiles } from '@/lib/project/virtual-files';
import type { VirtualFile, VirtualProjectFiles } from '@/lib/project/virtual-files';
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
import { supabase } from '@/lib/supabase';
import { getClerkToken } from '@/lib/clerk-token';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';
import { useUser } from '@clerk/nextjs';
import { BrandLockup } from '@/components/logo';
import { Menu } from 'lucide-react';

export function WorkspaceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded: tokenReady, isSignedIn, user: clerkUser } = useUser();
  const isAuthenticated = isSignedIn ?? false;
  const selectedProjectId = useWorkspaceStore(s => s.selectedProjectId);
  const setSelectedProjectId = useWorkspaceStore(s => s.setSelectedProjectId);
  const setProjectKey = useWorkspaceStore(s => s.setProjectKey);
  const { loadFromProject, bumpPreviewNonce, files, setThreadId, setProjectId, currentThreadId, reset: resetGenerationStore } = useGenerationStore();
  const { openCommandPalette, setOpenCommandPalette } = useDashboardShell();

  const [rightView, setRightView] = useState<V0RightView>('preview');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [workspaceSidebarOpen, setWorkspaceSidebarOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const projectBootStartedAtRef = useRef<number | null>(null);
  const projectBootLoggedRef = useRef<string | null>(null);
  const threadBootedRef = useRef<string | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);

  const urlProjectId = searchParams.get('project');
  const urlThreadId = searchParams.get('thread');
  const effectiveProjectId = urlProjectId;
  const { data: boot, error: bootError, isLoading: bootLoading, refetch: refetchBoot } = useProjectBoot(effectiveProjectId, !!effectiveProjectId);

  // Derive a GenerationRow-compatible object for the rest of the component.
  // Memoized to prevent infinite re-render loops from effect dependencies.
  const project = useMemo(() => boot ? {
    id: boot.project.id,
    code: boot.latest?.code ?? '',
    version: boot.latest?.version ?? 1,
    name: boot.project.name,
    description: boot.project.name,
    stack: boot.project.stack,
    prompt: boot.latest?.prompt ?? boot.project.description,
    metadata: boot.latest?.metadata ?? null,
    created_at: boot.latest?.created_at ?? boot.project.created_at,
    updated_at: boot.project.updated_at,
  } : undefined, [boot]);

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

  // Thread comes from boot data (no extra request) or explicit URL param.
  useEffect(() => {
    if (urlThreadId) {
      setThreadId(urlThreadId);
      return;
    }
    if (!effectiveProjectId) return;
    // Boot data includes the first thread — use it when available.
    // When boot is still loading (undefined), wait — the effect re-fires
    // when boot resolves.
    if (boot === undefined) return; // still loading
    if (threadBootedRef.current === effectiveProjectId) return;
    threadBootedRef.current = effectiveProjectId;

    if (boot?.firstThread?.id) {
      setThreadId(boot.firstThread.id);
    } else {
      setThreadId(null);
    }
  }, [setThreadId, effectiveProjectId, urlThreadId, boot]);

  // Track the project context in the client store so switching projects never
  // leaks files or chat history from the previous workspace.
  const activeProjectContextRef = useRef<string | null>(null);

  // Load project code into generation store.
  // Also ensures currentProjectId stays in sync with the URL param.
  useEffect(() => {
    if (!effectiveProjectId) return;

    const switched = activeProjectContextRef.current !== effectiveProjectId;
    if (switched) {
      activeProjectContextRef.current = effectiveProjectId;
      threadBootedRef.current = null;
      resetGenerationStore();
      setThreadId(urlThreadId || null);
    }

    // Always keep the project ID in the store so persistence and
    // thread lookups have a project context after code loads.
    setProjectId(effectiveProjectId);

    // When switching to a different project that truly has no saved code
    // (loaded, not loading), reset so old files / versions don't leak.
    if (switched && project !== undefined && !project?.code) {
      // Re-set project ID after reset cleared it
      setProjectId(effectiveProjectId);
      // Re-apply URL thread ID if present — resetGenerationStore wipes it,
      // which would prevent the chat panel from loading thread history.
      if (urlThreadId) {
        setThreadId(urlThreadId);
      }
    }

    if (project?.code) {
      loadFromProject(project.code, project.description || 'Loaded project');
    }
  }, [effectiveProjectId, loadFromProject, project, project?.code, project?.description, resetGenerationStore, setProjectId, setThreadId, urlThreadId]);

  // Fallback: restore files from thread messages when no saved code exists
  // Runs AFTER the thread is loaded (currentThreadId is set)
  useEffect(() => {
    if (!currentThreadId) return;
    if (project?.code) return; // Already loaded from saved code

    const generationStore = useGenerationStore.getState();
    if (
      generationStore.files &&
      Object.values(generationStore.files.files).some(
        (file) => file.status !== 'deleted' && file.content.trim().length > 0,
      )
    ) return; // Already has files

    (async () => {
      try {
        const token = getClerkToken();
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

  // Final fallback: restore files from project_files table when
  // neither saved generations nor thread messages have code.
  // Agent tool calls write files to project_files but the generations.code
  // field may be empty, and the agent response text may not contain code fences.
  useEffect(() => {
    if (!effectiveProjectId) return;
    if (project?.code) return; // Already loaded

    const genStore = useGenerationStore.getState();
    if (genStore.files && Object.keys(genStore.files.files).length > 1) return; // Already has files

    (async () => {
      try {
        const { data: fileRows } = await supabase
          .from('project_files')
          .select('path, content, language')
          .eq('project_id', effectiveProjectId)
          .neq('status', 'deleted');

        if (!fileRows || fileRows.length === 0) return;

        const entryPath = fileRows.find((r: { path: string }) => r.path === 'app/page.tsx')
          ? 'app/page.tsx'
          : fileRows[0]!.path;
        const files: Record<string, VirtualFile> = {};
        for (const row of fileRows) {
          files[row.path] = {
            path: row.path,
            content: row.content || '',
            language: row.language,
            status: 'unchanged' as const,
          };
        }
        const virtualFiles: VirtualProjectFiles = { entryPath, files };

        // Serialize and load into store
        const serialized = serializeVirtualFiles(virtualFiles);
        if (serialized) {
          loadFromProject(serialized, project?.description || 'Restored from project files');
        }
      } catch {
        // Silently fail — no files to restore
      }
    })();
  }, [effectiveProjectId, project?.code, project?.description, loadFromProject]);

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
    Object.values(files.files).some(f => f.status !== 'deleted' && f.content.trim().length > 0));
  const showOnlyChat = !hasGeneratedFiles;

  useEffect(() => {
    setRightCollapsed(showOnlyChat);
    if (hasGeneratedFiles) {
      setRightView('preview');
    }
  }, [showOnlyChat, hasGeneratedFiles]);

  useEffect(() => {
    if (!tokenReady || !tokenReady || isAuthenticated) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const token = getClerkToken();
      if (!cancelled && !token) {
        const loginUrl = new URL('/login', window.location.origin);
        loginUrl.searchParams.set('redirect', `${window.location.pathname}${window.location.search}`);
        router.replace(loginUrl.pathname + loginUrl.search);
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [isAuthenticated, router, !tokenReady, tokenReady]);

  if (!tokenReady || !tokenReady) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--accent)' }}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
        <div className="text-sm text-[var(--text-secondary)]">Restoring your token...</div>
      </div>
    );
  }

  if (!effectiveProjectId) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center gap-3 bg-background">
        <div className="text-sm font-medium text-[var(--text-primary)]">No project selected</div>
        <button
          onClick={() => router.push('/dashboard/home')}
          className="text-xs text-[var(--accent)] hover:underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  // Show project load error with retry
  if (bootError && !boot) {
    return (
      <div className="min-h-[100dvh] w-full flex flex-col items-center justify-center gap-3 bg-background">
        <div className="text-sm font-medium text-[var(--text-primary)]">Failed to load project</div>
        <div className="text-xs text-[var(--text-secondary)]">
          {bootError instanceof Error ? bootError.message : 'Unknown error'}
        </div>
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={() => refetchBoot()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-[var(--app-accent)] text-white hover:opacity-90 transition-opacity"
          >
            Retry
          </button>
          <button
            onClick={() => router.push('/dashboard/home')}
            className="text-xs text-[var(--text-secondary)] hover:underline"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show loading while boot data is being fetched
  if (bootLoading && !boot) {
    return (
      <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: 'var(--accent)' }}
        />
      </div>
    );
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
