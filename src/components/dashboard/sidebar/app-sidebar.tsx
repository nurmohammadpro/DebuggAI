'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useSessionStore } from '@/store/session-store';
import {
  Home,
  Pencil,
  Bug,
  ListChecks,
  GitBranch,
  Zap,
  Sun,
  Moon,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  History,
  Settings,
  Search,
  MessageSquare,
  FolderKanban,
  GripVertical,
  Trash2,
  Pencil as PencilIcon,
} from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { WorkspaceAccountMenu } from '@/components/workspace/workspace-account-menu';
import { useMyThreads } from '@/hooks/queries/use-my-threads';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { cn } from '@/lib/utils';
import { BrandLockup } from '@/components/logo';
import { formatDistanceToNowStrict } from 'date-fns';
import { getSession } from '@/hooks/use-session';
import { csrfHeader } from '@/lib/csrf-client';
import { useGenerationStore } from '@/store/generation-store';
import { useConfirmDialog } from '@/components/admin/confirm-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { GenerationRow } from '@/hooks/queries/use-my-projects';
import type { ThreadRow } from '@/hooks/queries/use-my-threads';
import { toast } from 'sonner';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

// ── Relative time formatter ──
function fmtRelative(iso: string): string {
  if (!iso) return '';
  try { return formatDistanceToNowStrict(new Date(iso), { addSuffix: true }); }
  catch { return ''; }
}

// ── Nav item type ──
interface NavItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  shortcut?: string;
  badge?: number;
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useSessionStore();
  const { resolvedTheme, setTheme } = useTheme();
  const { setThreadId, clearThread } = useGenerationStore();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const queryClient = useQueryClient();
  const { state: sidebarState } = useSidebar();
  const collapsed = sidebarState === 'collapsed';

  const [showSecondary, setShowSecondary] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');

  // ── Data ──
  const activeProjectId = searchParams?.get('project') || '';
  const { data: fetchedThreads = [] } = useMyThreads(10, !!activeProjectId, activeProjectId || null);
  const { data: fetchedProjects = [] } = useMyProjects(8);

  const threads = fetchedThreads;
  const projects = fetchedProjects;

  // ── Draggable nav order (persisted) ──
  const [navOrder, setNavOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('debuggai.sidebar.navOrder');
      return saved ? JSON.parse(saved) : ['home', 'builder', 'debug', 'runs', 'branches'];
    } catch { return ['home', 'builder', 'debug', 'runs', 'branches']; }
  });
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);

  const persistNavOrder = (order: string[]) => {
    setNavOrder(order);
    try { localStorage.setItem('debuggai.sidebar.navOrder', JSON.stringify(order)); } catch {}
  };

  const reorderItem = (fromKey: string, toKey: string) => {
    if (fromKey === toKey) return;
    const fromIdx = navOrder.indexOf(fromKey);
    const toIdx = navOrder.indexOf(toKey);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...navOrder];
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, fromKey);
    persistNavOrder(next);
  };

  const handleDragStart = (e: React.DragEvent, key: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragging(key);
  };
  const handleDragOverSlot = (e: React.DragEvent, key: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragging !== key) setDragOver(key);
  };
  const handleDrop = (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    if (!dragging || dragging === targetKey) { setDragging(null); setDragOver(null); return; }
    reorderItem(dragging, targetKey);
    setDragging(null);
    setDragOver(null);
  };

  // ── Nav definitions ──
  const isWorkspace = pathname === '/dashboard' && !!activeProjectId;
  const isDashboardHome = pathname === '/dashboard' && !activeProjectId;
  const isDebug = pathname === '/dashboard/debug' || pathname.startsWith('/dashboard/debug/');
  const isRuns = pathname === '/dashboard/runs' || pathname.startsWith('/dashboard/runs/');
  const isBranches = pathname === '/dashboard/branches';
  const isWebBuilder = pathname === '/dashboard/web-builder';

  const allNavItems = useMemo<Record<string, Omit<NavItem, 'key'>>>(() => ({
    home:     { href: '/dashboard/home', icon: Home, label: 'Home', active: isDashboardHome, shortcut: 'H' },
    builder:  { href: `/dashboard?project=${activeProjectId}`, icon: Pencil, label: 'Builder', active: isWorkspace, shortcut: 'B' },
    debug:    { href: '/dashboard/debug', icon: Bug, label: 'Debug', active: isDebug || isWebBuilder, shortcut: 'D' },
    runs:     { href: '/dashboard/runs', icon: ListChecks, label: 'Runs', active: isRuns, shortcut: 'R' },
    branches: { href: '/dashboard/branches', icon: GitBranch, label: 'Branches', active: isBranches, shortcut: 'G' },
  }), [activeProjectId, isWorkspace, isDashboardHome, isDebug, isRuns, isBranches, isWebBuilder]);

  const primaryKeys = ['home', 'builder'];
  const secondaryKeys = navOrder.filter(k => !primaryKeys.includes(k));
  const visiblePrimaryKeys = primaryKeys.filter(k => k !== 'builder' || !!activeProjectId);

  const primaryItems: NavItem[] = visiblePrimaryKeys.map(k => ({ key: k, ...allNavItems[k] }));
  const secondaryItems: NavItem[] = secondaryKeys.map(k => ({ key: k, ...allNavItems[k] }));

  // Search filtering
  const filterBySearch = (items: NavItem[]) => {
    if (!sidebarSearch.trim()) return items;
    const q = sidebarSearch.toLowerCase();
    return items.filter(i => i.label.toLowerCase().includes(q) || i.key.includes(q));
  };

  const filteredPrimary = filterBySearch(primaryItems);
  const filteredSecondary = filterBySearch(secondaryItems);

  // ── Recent threads ──
  const recentThreads = useMemo(() => threads.slice(0, 10), [threads]);

  // ── Current project context ──
  const currentProject = useMemo(
    () => activeProjectId ? projects.find(p => p.id === activeProjectId) : null,
    [activeProjectId, projects]
  );

  const credits = user?.credits;

  // ── Thread actions ──
  const handleRenameThread = useCallback(async (thread: ThreadRow) => {
    const next = window.prompt('Rename thread', (thread.title || '').trim() || 'New thread');
    if (next == null) return;
    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;
    await fetch(`/api/threads/${thread.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...csrfHeader() },
      body: JSON.stringify({ title: next }),
    });
    router.refresh();
  }, [router]);

  const handleDeleteThread = useCallback(async (thread: ThreadRow) => {
    const ok = await confirm('Delete thread?', 'This cannot be undone.', { confirmText: 'Delete', variant: 'destructive' });
    if (!ok) return;
    const session = await getSession();
    const token = session.session?.access_token;
    if (!token) return;
    const res = await fetch(`/api/threads/${thread.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, ...csrfHeader() },
    });
    if (!res.ok) {
      toast.error('Failed to delete thread');
      return;
    }
    toast.success('Thread deleted');
    await queryClient.refetchQueries({ queryKey: ['threads', 'mine'] });
    if (searchParams?.get('thread') === thread.id) {
      clearThread();
      if (activeProjectId) router.push(`/dashboard?project=${activeProjectId}`);
      else router.push('/dashboard');
    }
  }, [confirm, queryClient, searchParams, activeProjectId, clearThread, router]);

  if (user?.isAdmin == undefined) return null; // Wait for session hydration

  return (
    <>
      <ConfirmDialogComponent />
      <Sidebar collapsible="icon">
        {/* ── Header: Brand + New Project + Search ── */}
        <SidebarHeader className="gap-3">
          <div className="flex items-center justify-between">
            <Link href="/dashboard/home" className="flex items-center gap-3 rounded-md hover:opacity-80 transition-opacity group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full">
              <BrandLockup
                className="gap-3 group-data-[collapsible=icon]:gap-0"
                logoClassName="h-8 w-8"
                textClassName="text-sm font-semibold whitespace-nowrap group-data-[collapsible=icon]:hidden"
              />
            </Link>
          </div>

          <Link href="/dashboard/home?create=1"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[12px] font-semibold bg-[var(--ds-green)] text-white hover:bg-[var(--ds-green-bright)] transition-all duration-150 active:scale-95 shadow-sm hover:shadow-md group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
            <Plus className="h-4 w-4 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">New Project</span>
          </Link>

          <div className="relative group-data-[collapsible=icon]:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--app-text-dim)]" />
            <SidebarInput
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-10"
            />
            {sidebarSearch && (
              <button onClick={() => setSidebarSearch('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 touch-target-sm flex items-center justify-center text-[var(--app-text-dim)] hover:text-[var(--app-text)] transition-colors">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </SidebarHeader>

        {/* ── Content: Nav + Recent ── */}
        <SidebarContent>
          {/* Primary nav */}
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {filteredPrimary.map((item) => (
                  <NavItemRow
                    key={item.key}
                    item={item}
                    onDragStart={(e) => handleDragStart(e, item.key)}
                    onDragOver={(e) => handleDragOverSlot(e, item.key)}
                    onDrop={(e) => handleDrop(e, item.key)}
                    isDragOver={dragOver === item.key}
                    isDragging={dragging === item.key}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Tools accordion + secondary nav */}
          <SidebarGroup>
            <button
              onClick={() => setShowSecondary(!showSecondary)}
              className="flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 w-full cursor-pointer hover:text-sidebar-foreground transition-colors"
            >
              Tools
              {showSecondary ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
            </button>
            {showSecondary && (
              <SidebarGroupContent>
                <SidebarMenu>
                  {filteredSecondary.map((item) => (
                    <NavItemRow
                      key={item.key}
                      item={item}
                      onDragStart={(e) => handleDragStart(e, item.key)}
                      onDragOver={(e) => handleDragOverSlot(e, item.key)}
                      onDrop={(e) => handleDrop(e, item.key)}
                      isDragOver={dragOver === item.key}
                      isDragging={dragging === item.key}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            )}
          </SidebarGroup>

          <SidebarSeparator />

          {/* Recent Projects */}
          {projects.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>
                <FolderKanban className="h-3.5 w-3.5" /> Recent Projects
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {projects.slice(0, 5).map((p) => (
                    <SidebarMenuItem key={p.id}>
                      <SidebarMenuButton
                        tooltip={p.description || p.prompt || 'Untitled'}
                        onClick={() => router.push(`/dashboard?project=${p.id}`)}
                      >
                        <FolderKanban className="h-4 w-4 shrink-0 text-[var(--app-text-dim)]" />
                        <span className="truncate flex-1">{p.description || p.prompt || 'Untitled'}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Project context */}
          {currentProject && (
            <SidebarGroup>
              <SidebarGroupLabel>
                <FolderKanban className="h-3 w-3" /> Project
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2 py-1">
                  <p className="text-[12px] font-medium text-sidebar-foreground truncate">
                    {currentProject.description || currentProject.prompt || 'Untitled'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] text-[var(--app-text-dim)]">{currentProject.stack || 'Web Builder'}</span>
                    <span className="text-[9px] text-[var(--app-text-dim)]">•</span>
                    <span className="text-[9px] text-[var(--app-text-dim)]">{fmtRelative(currentProject.updated_at || currentProject.created_at)}</span>
                  </div>
                  <Link href={activeProjectId ? `/dashboard/settings?project=${activeProjectId}` : '/dashboard/settings'}
                    className="inline-flex items-center gap-1 mt-2 text-[10px] text-[var(--app-text-dim)] hover:text-sidebar-foreground transition-colors">
                    <Settings className="h-3 w-3" /> Settings
                  </Link>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Recent threads */}
          <SidebarGroup>
            <SidebarGroupLabel>
              <History className="h-3.5 w-3.5" /> Recent
            </SidebarGroupLabel>
            <SidebarGroupContent>
              {recentThreads.length === 0 ? (
                <p className="px-2 py-1 text-[11px] text-[var(--app-text-dim)] italic">No history yet</p>
              ) : (
                <SidebarMenu>
                  {recentThreads.map((t) => (
                    <ThreadRowItem
                      key={t.id}
                      thread={t}
                      activeProjectId={activeProjectId}
                      onRename={handleRenameThread}
                      onDelete={handleDeleteThread}
                    />
                  ))}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        {/* ── Footer: Credits + Theme + Account ── */}
        <SidebarFooter className="gap-1">
          <div className="flex items-center gap-3 px-3 py-2 text-[12px] text-sidebar-foreground/70 group-data-[collapsible=icon]:justify-center">
            <Zap className="shrink-0 h-4 w-4" />
            <span className="truncate group-data-[collapsible=icon]:hidden">
              {credits === -1 ? 'Unlimited' : `${credits ?? 0} credits`}
            </span>
          </div>
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors group-data-[collapsible=icon]:justify-center"
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span className="group-data-[collapsible=icon]:hidden">
              {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
            </span>
          </button>
          <div className="px-3 py-1 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
            <WorkspaceAccountMenu />
          </div>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Nav Item Row (with drag-drop, active indicator)
// ════════════════════════════════════════════════════════════════════════
function NavItemRow({
  item,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
  isDragging,
}: {
  item: NavItem;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragOver?: boolean;
  isDragging?: boolean;
}) {
  const router = useRouter();

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={item.active}
        tooltip={`${item.label}${item.shortcut ? ` (⌘${item.shortcut})` : ''}`}
        className={cn(
          isDragOver && 'bg-[var(--ds-green)]/10 border border-dashed border-[var(--ds-green)]/30',
          isDragging && 'opacity-40',
        )}
        onClick={() => router.push(item.href)}
        draggable
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <item.icon />
        <span>{item.label}</span>
      </SidebarMenuButton>
      {item.shortcut && (
        <SidebarMenuAction showOnHover title={`⌘${item.shortcut}`}>
          <kbd className="text-[9px] font-mono text-[var(--app-text-dim)]">⌘{item.shortcut}</kbd>
        </SidebarMenuAction>
      )}
    </SidebarMenuItem>
  );
}

// ════════════════════════════════════════════════════════════════════════
//  Thread Row (with rename/delete actions)
// ════════════════════════════════════════════════════════════════════════
function ThreadRowItem({
  thread,
  activeProjectId,
  onRename,
  onDelete,
}: {
  thread: ThreadRow;
  activeProjectId: string;
  onRename: (t: ThreadRow) => void;
  onDelete: (t: ThreadRow) => void;
}) {
  const router = useRouter();
  const title = (thread.title || '').trim() || 'New thread';
  const href = thread.project_id
    ? `/dashboard?project=${thread.project_id}&thread=${thread.id}`
    : activeProjectId
      ? `/dashboard?project=${activeProjectId}&thread=${thread.id}`
      : `/dashboard?thread=${thread.id}`;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={title}
        onClick={() => router.push(href)}
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        <span className="flex-1 min-w-0 truncate">{title}</span>
      </SidebarMenuButton>
      <SidebarMenuAction
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRename(thread); }}
        showOnHover
        title="Rename"
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </SidebarMenuAction>
      <SidebarMenuAction
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(thread); }}
        showOnHover
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </SidebarMenuAction>
    </SidebarMenuItem>
  );
}
