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
import { WorkspaceSidebar } from '@/components/workspace/workspace-sidebar';
import { V0RightPanel } from '@/components/workspace/v0-right-panel';
import type { V0RightView } from '@/components/workspace/v0-right-panel';
import { Panel } from '@/components/panel/panel';
import { MoreVertical, PanelRight } from 'lucide-react';
import { WorkspaceSaveVersionButton } from '@/components/workspace/workspace-save-version-button';
import { ExportActions } from '@/components/workspace/export-actions';
import { DeployModal } from '@/components/workspace/deploy-modal';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { useCursorTracking, CollabCursorOverlay, CollabStatusBar } from '@/components/workspace/collab-cursors';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/hooks/use-session';

export function WorkspaceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useSessionStore();
  const { selectedProjectId, setSelectedProjectId, setProjectKey } = useWorkspaceStore();
  const { loadFromProject, bumpPreviewNonce, files, setThreadId, setProjectId, currentThreadId } = useGenerationStore();
  const { recentThreads, recentProjects, openCommandPalette, setOpenCommandPalette } = useDashboardShell();

  const [rightView, setRightView] = useState<V0RightView>('code');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const projectBootStartedAtRef = useRef<number | null>(null);
  const projectBootLoggedRef = useRef<string | null>(null);
  const threadBootedRef = useRef<string | null>(null);
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
          }
        } catch {
          // Silently fail — chat will start fresh
        } finally {
          setLoadingThread(false);
        }
      })();
    }
  }, [setThreadId, effectiveProjectId, urlThreadId]);

  useEffect(() => {
    if (effectiveProjectId) setProjectId(effectiveProjectId);
  }, [effectiveProjectId, setProjectId]);

  // Load project code into generation store
  useEffect(() => {
    if (project?.code) {
      loadFromProject(project.code, project.description || 'Loaded project');
    }
  }, [effectiveProjectId, loadFromProject, project?.code, project?.description]);

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

      {/* Absolute-positioned sidebar — doesn't affect flex layout */}
      <WorkspaceSidebar />

      {/* Main Content — pl-[48px] accounts for absolute sidebar */}
      <main className="flex-1 min-w-0 flex flex-col md:pl-12">
        {/* Thin top bar — project name + collab status + mobile menu */}
        <div className="h-10 flex items-center gap-2 px-4 shrink-0 bg-[var(--app-panel)] border-b border-[var(--app-border)]">
          {/* Hamburger moved to WorkspaceSidebar */}

          <span className="text-[12px] font-semibold text-[var(--app-text)] truncate">
            {projectName}
          </span>

          <span className="inline-flex rounded-[5px] bg-[var(--app-surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--app-text-muted)] hidden sm:inline-flex">
            builder
          </span>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-1.5">
            <ExportActions />
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
                <DropdownMenuItem onClick={handleRun} className="cursor-pointer">Run Preview</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeployModalOpen(true)} className="cursor-pointer">Deploy</DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare} className="cursor-pointer">Share Link</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-default px-3 py-1">
                  <ExportActions />
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

        {/* IDE Workspace — v0.dev layout: narrow chat | splitter | wide preview+code */}
        <div className="flex-1 min-h-0 flex min-w-0">
          {/* Chat — narrow panel on left (v0.dev style) */}
          <section
            data-chat-panel
            className={
            showOnlyChat
              ? "flex-1 min-w-0 max-w-[720px] mx-auto bg-[var(--app-bg)] flex flex-col min-h-0"
              : "w-[360px] min-w-[300px] max-w-[420px] bg-[var(--app-bg)] flex flex-col min-h-0 border-r border-[var(--app-border)]"
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
                  // Chat width adjusts relative to DnD
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

          {/* Right panel — desktop (takes remaining space) */}
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
