'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ChatPanel } from '@/components/web-builder/chat-panel';
import { Code2, Eye, Files, GitBranch, LayoutPanelTop, Database, ListChecks, Menu, Play, Plug, Rocket, Settings, Share2, Terminal, Zap, LibraryBig, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useDashboardShell } from '@/hooks/use-dashboard-shell';
import { WorkspaceSaveVersionButton } from '@/components/workspace/workspace-save-version-button';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { DeployModal } from '@/components/workspace/deploy-modal';
import type { WorkspaceRightTab } from '@/components/workspace/workspace-right-panel';
import { CommandPalette } from '@/components/dashboard/command-palette';
import { useCursorTracking, CollabCursorOverlay, CollabStatusBar } from '@/components/workspace/collab-cursors';

export function WorkspaceDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useSessionStore();
  const { selectedProjectId, setSelectedProjectId, setProjectKey } = useWorkspaceStore();
  const { loadFromProject, bumpPreviewNonce, getProjectCode, savedSnapshot, currentCode, files, setThreadId } = useGenerationStore();
  const { recentThreads, recentProjects, openCommandPalette, setOpenCommandPalette } = useDashboardShell();

  const [rightTab, setRightTab] = useState<WorkspaceRightTab>('code');
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [rightWidth, setRightWidth] = useState(980);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [stage, setStage] = useState<'seed' | 'sprout' | 'sapling' | 'tree'>('sapling');
  const projectBootStartedAtRef = useRef<number | null>(null);
  const projectBootLoggedRef = useRef<string | null>(null);

  const urlProjectId = searchParams.get('project');
  const urlThreadId = searchParams.get('thread');
  const effectiveProjectId = urlProjectId;
  const { data: project } = useProject(effectiveProjectId, !!effectiveProjectId);

  const { remoteCursors, broadcastCursor } = useCursorTracking(effectiveProjectId || '', !!effectiveProjectId);

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
    // Keep the code surface visible by default; the chat is now the center panel.
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

  // If no project, show DashboardHome (handled by the caller)
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

  const stageTone =
    stage === 'seed'
      ? 'bg-[var(--app-info-soft)] text-[var(--app-info)] border-[var(--app-info)]/20'
      : stage === 'sprout'
        ? 'bg-[var(--app-warning-soft)] text-[var(--app-warning)] border-[var(--app-warning)]/20'
        : stage === 'tree'
          ? 'bg-[var(--app-success-soft)] text-[var(--app-success)] border-[var(--app-success)]/20'
          : 'bg-[var(--app-accent-soft)] text-[var(--app-accent)] border-[var(--app-accent)]/20';

  const headerActions = (
    <>
      {/* Credits Display */}
      <div className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-[6px] bg-[var(--app-surface)] border border-[var(--app-border)]">
        <Zap className="h-3.5 w-3.5 text-[var(--ds-green)]" />
        <span className="font-semibold text-[var(--app-text)]">
          {useSessionStore.getState().user?.credits === -1 ? '∞' : useSessionStore.getState().user?.credits ?? 0}
        </span>
        <span className="text-[var(--app-text-muted)]">credits</span>
      </div>

      {/* Collab Status */}
      <CollabStatusBar cursors={remoteCursors} />

      {/* Deploy Button */}
      <button
        className="h-8 px-3 rounded-[6px] border border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)] transition-colors inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tight text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
        onClick={() => setDeployModalOpen(true)}
      >
        <Rocket className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Deploy</span>
      </button>

      {/* Save Version */}
      <WorkspaceSaveVersionButton />

      {/* Share Button */}
      <button
        className="h-8 px-3 rounded-[6px] border border-[var(--app-border)] bg-transparent hover:bg-[var(--app-surface)] transition-colors inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tight text-[var(--app-text-muted)] hover:text-[var(--app-text)]"
        onClick={handleShare}
      >
        <Share2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Share</span>
      </button>

      {/* Run Button */}
      <button
        className="h-8 px-3 rounded-[6px] bg-[var(--ds-green)] text-[#071006] hover:bg-[var(--ds-green-bright)] transition inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-tight"
        onClick={handleRun}
      >
        <Play className="h-3.5 w-3.5" />
        <span>Run</span>
      </button>

      {/* Account Menu */}
      <WorkspaceAccountMenu />
    </>
  );

  const toolTabs = [
    { id: 'code' as const, label: 'Code', icon: Code2 },
    { id: 'visual' as const, label: 'Visual', icon: LayoutPanelTop },
    { id: 'preview' as const, label: 'Preview', icon: Eye },
    { id: 'schema' as const, label: 'Schema', icon: Database },
    { id: 'files' as const, label: 'Files', icon: Files },
    { id: 'console' as const, label: 'Console', icon: Terminal },
    { id: 'runs' as const, label: 'Runs', icon: ListChecks },
    { id: 'git' as const, label: 'Git', icon: GitBranch },
    { id: 'env' as const, label: 'Env', icon: Settings },
    { id: 'connections' as const, label: 'Connect', icon: Plug },
  ];

  return (
    <div className="min-h-[100dvh] w-full overflow-hidden bg-[var(--app-bg)] text-[var(--app-text)] flex">
      <CollabCursorOverlay cursors={remoteCursors} />
      <CommandPalette open={openCommandPalette} onOpenChange={setOpenCommandPalette} />

      {/* Deploy Modal */}
      <DeployModal
        open={deployModalOpen}
        onOpenChange={setDeployModalOpen}
        projectId={effectiveProjectId}
        projectFiles={files?.files ? Object.fromEntries(
          Object.entries(files.files).map(([path, f]) => [path, f.content])
        ) : {}}
        projectName={project?.prompt || project?.description || 'my-app'}
      />
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <UnifiedSidebar
          recentThreads={recentThreads}
          recentProjects={recentProjects}
          collapsed={false}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="sidebar-overlay"
            className="fixed inset-0 z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="absolute inset-0 bg-black/50" />
            <motion.div
              className="absolute inset-y-0 left-0 w-64 bg-[var(--app-panel)] border-r border-[var(--app-border)] overflow-y-auto"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            >
              <UnifiedSidebar
                recentThreads={recentThreads}
                recentProjects={recentProjects}
                collapsed={false}
                mobile
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Unified Header */}
        <UnifiedHeader
          title={project?.description || project?.prompt || 'Untitled Project'}
          subtitle={effectiveProjectId}
          titleBadge={
            <div className="hidden sm:flex items-center gap-2">
              <span className="inline-flex rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-text-muted)]">
                Web Builder
              </span>
              <span className={`inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${stageTone}`}>
                {stage}
              </span>
            </div>
          }
          actions={headerActions}
          toolTabs={toolTabs}
          activeToolTab={rightTab}
          onToolTabChange={(tab) => {
            setRightCollapsed(false);
            setRightTab(tab);
            setMobilePanelOpen(true);
          }}
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
            <div className="h-11 border-b border-[var(--app-border)] bg-[var(--app-panel)] flex items-center justify-between px-4 shrink-0">
              <div className="min-w-0">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text)]">
                  Assistant
                </h2>
                <p className="text-[11px] text-[var(--app-text-dim)] truncate">
                  Build, debug, and revise this project from one thread.
                </p>
              </div>
              {unsavedCount > 0 && (
                <span className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--app-text-muted)]">
                  Unsaved
                </span>
              )}
            </div>

            <div className="border-b border-[var(--app-border)] bg-[var(--app-panel)] px-4 py-3 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-[var(--app-text)]">Progress narrative</div>
                  <div className="text-[11px] text-[var(--app-text-dim)] truncate">
                    Plan, edit, verify, export. Keep the loop visible.
                  </div>
                </div>
                <button
                  onClick={() =>
                    setStage((s) => (s === 'seed' ? 'sprout' : s === 'sprout' ? 'sapling' : s === 'sapling' ? 'tree' : 'seed'))
                  }
                  className="h-7 px-2 rounded-[6px] border border-[var(--app-border)] text-[11px] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] transition-colors"
                >
                  Advance
                </button>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { label: 'Plan', done: stage !== 'seed' },
                  { label: 'Edit', done: stage === 'sapling' || stage === 'tree' },
                  { label: 'Verify', done: stage === 'tree' },
                  { label: 'Export', done: false },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-2 py-1.5"
                  >
                    <CheckCircle2
                      className={`h-4 w-4 ${s.done ? 'text-[var(--app-success)]' : 'text-[var(--app-text-dim)]'}`}
                    />
                    <div className="text-[12px] text-[var(--app-text)]">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <ChatPanel
              height="100%"
              chromeless
              mode="build"
              className="h-full rounded-none border-0 bg-transparent"
            />
          </section>

          {/* Splitter */}
          <WorkspaceSplitter
            ariaLabel="Resize right panel"
            onResize={(dx) =>
              setRightWidth((w) => clamp(w - dx, 420, 1400))
            }
          />

          {/* Code, preview, files, and project tools */}
          <div className="hidden sm:block transition-all duration-200 ease-out" style={{ width: rightCollapsed ? undefined : clamp(rightWidth, 420, 1400) }}>
            <WorkspaceRightPanel
              activeTab={rightTab}
              onTabChange={setRightTab}
              collapsed={rightCollapsed}
              onToggleCollapsed={() => setRightCollapsed((v) => !v)}
              width={clamp(rightWidth, 420, 1400)}
              onEditorViewChange={(view) => {
                setRightTab(view);
              }}
            />
          </div>
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

        {/* Mobile Panel Overlay */}
        <AnimatePresence>
          {mobilePanelOpen && (
            <motion.div
              key="mobile-panel-overlay"
              className="fixed inset-0 z-50 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobilePanelOpen(false)}
            >
              <div className="absolute inset-0 bg-black/50" />
              <motion.div
                className="absolute inset-y-0 right-0 w-full max-w-[90vw] bg-[var(--app-panel)] flex flex-col"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <WorkspaceRightPanel
                  activeTab={rightTab}
                  onTabChange={setRightTab}
                  collapsed={false}
                  onToggleCollapsed={() => {}}
                  width={0}
                  mobile
                  onMobileClose={() => setMobilePanelOpen(false)}
                  onEditorViewChange={(view) => {
                    setRightTab(view);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
