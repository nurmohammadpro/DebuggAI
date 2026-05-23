'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { Plus } from 'lucide-react';

import { ProjectsFilters } from '@/components/dashboard/projects/projects-filters';
import { ProjectCard } from '@/components/dashboard/projects/project-card';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { useMyThreads } from '@/hooks/queries/use-my-threads';
import { useMyDebugSessions } from '@/hooks/queries/use-my-debug-sessions';
import { supabase } from '@/lib/supabase';
import { getProjectKey } from '@/lib/project/project-key';
import { RecentDebugSessions } from '@/components/dashboard/home/recent-debug-sessions';
import { RecentTransactions } from '@/components/dashboard/home/recent-transactions';
import { CreateProjectDialog } from '@/components/dashboard/projects/create-project-dialog';
import { FolderKanban, Bug, MessageSquare } from 'lucide-react';

export function ProjectsHub() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [stack, setStack] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error, refetch } = useMyProjects(75, true);
  const { data: threads } = useMyThreads(50, true);
  const { data: debugSessions } = useMyDebugSessions(100, true);

  const latestProject = (data || [])[0] || null;
  const latestThread = (threads || [])[0] || null;

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('create') !== '1') return;
    setCreateOpen(true);
    url.searchParams.delete('create');
    const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '');
    router.replace(next);
  }, [router]);

  const projects = useMemo(() => {
    const list = data || [];
    const q = query.trim().toLowerCase();
    return list.filter((p) => {
      const stackOk = stack === 'all' ? true : p.stack === stack;
      if (!stackOk) return false;
      if (!q) return true;
      return (
        (p.description || '').toLowerCase().includes(q) ||
        (p.prompt || '').toLowerCase().includes(q)
      );
    });
  }, [data, query, stack]);

  const onDuplicate = async (project: (typeof projects)[number]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!session?.user || !token) {
        toast.error('Please sign in again');
        return;
      }

      const { data: source, error: sourceError } = await supabase
        .from('generations')
        .select('code')
        .eq('id', project.id)
        .single();

      if (sourceError) throw sourceError;
      if (!source?.code) throw new Error('Source project has no code to duplicate');

      const duplicateName = project.description ? `Copy of ${project.description}` : 'Copy';
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          description: duplicateName,
          stack: project.stack,
          prompt: project.prompt || duplicateName,
          code: source.code,
          metadata: { ...(project.metadata || {}), project_key: getProjectKey(project) },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Failed to duplicate');
      toast.success('Project duplicated');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to duplicate');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-[var(--text-primary)]">Dashboard</div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            Projects, threads, and recent activity.
          </div>
        </div>
        <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          <span className="hidden sm:inline text-xs">New Project</span>
          <span className="sm:hidden text-xs">Create</span>
        </CreateProjectDialog>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <StatCard icon={FolderKanban} label="Projects" value={String((data || []).length)} sub="In your workspace" />
        <StatCard icon={Bug} label="Debug Sessions" value={String((debugSessions || []).length)} sub="Last 100 sessions" />
        <StatCard icon={MessageSquare} label="Threads" value={String((threads || []).length)} sub="Last 50 threads" />
      </div>

      <ProjectsFilters
        query={query}
        onQueryChange={setQuery}
        stack={stack}
        onStackChange={setStack}
      />

      <div className="grid lg:grid-cols-[1fr,280px] gap-4 items-start">
        <div className="space-y-3 order-2 lg:order-1">
          {error && (
            <div className="border border-[var(--border-default)] p-4">
              <div className="text-sm font-medium text-[var(--text-primary)]">Failed to load projects</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                {error instanceof Error ? error.message : 'Unknown error'}
              </div>
              <div className="mt-3">
                <button
                  onClick={() => refetch()}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="space-y-2">
              <div className="border border-[var(--border-default)] p-3 h-14 animate-pulse" />
              <div className="border border-[var(--border-default)] p-3 h-14 animate-pulse" />
              <div className="border border-[var(--border-default)] p-3 h-14 animate-pulse" />
            </div>
          )}

          {!isLoading && !error && projects.length === 0 && (
            <div className="border border-[var(--border-default)] p-6 text-center">
              <div className="text-sm font-medium text-[var(--text-primary)]">No projects yet</div>
              <div className="text-xs text-[var(--text-secondary)] mt-1">
                Generate your first project to get started.
              </div>
            </div>
          )}

          {!isLoading && !error && projects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <div>
                  {projects.length} projects
                </div>
                <div>
                  Updated{' '}
                  {formatDistanceToNowStrict(new Date(projects[0]!.created_at), {
                    addSuffix: true,
                  })}
                </div>
              </div>
              <div className="border border-[var(--border-default)] divide-y divide-[var(--border-default)]">
                {projects.map((p) => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    onDuplicate={onDuplicate}
                    onDeleted={() => refetch()}
                    onRenamed={() => refetch()}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-3 order-1 lg:order-2">
          <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
            <div className="px-3 py-2 border-b border-[var(--app-border)]">
              <div className="text-xs font-medium text-[var(--app-text)]">Continue</div>
              <div className="text-[11px] text-[var(--app-text-muted)] mt-0.5">
                Jump back into your latest work.
              </div>
            </div>

            <div className="p-3 space-y-3">
              {latestProject ? (
                <button
                  onClick={() => router.push(`/dashboard?project=${latestProject.id}`)}
                  className="w-full text-left rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] hover:bg-[var(--app-surface)] transition-colors px-3 py-2"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    Latest project
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[var(--app-text)] line-clamp-1">
                    {latestProject.description || latestProject.prompt || 'Untitled project'}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--app-text-muted)] line-clamp-1">
                    Open workspace
                  </div>
                </button>
              ) : (
                <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    Latest project
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--app-text-muted)]">No projects yet.</div>
                </div>
              )}

              {latestThread ? (
                <button
                  onClick={() => {
                    const projectId = latestThread.project_id;
                    const url = projectId
                      ? `/dashboard?project=${projectId}&thread=${latestThread.id}`
                      : `/dashboard?thread=${latestThread.id}`;
                    router.push(url);
                  }}
                  className="w-full text-left rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] hover:bg-[var(--app-surface)] transition-colors px-3 py-2"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    Latest thread
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[var(--app-text)] line-clamp-1">
                    {(latestThread.title || '').trim() || latestThread.id.slice(0, 8)}
                  </div>
                  <div className="mt-1 text-[11px] text-[var(--app-text-muted)] line-clamp-1">
                    Re-open conversation
                  </div>
                </button>
              ) : (
                <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)]">
                    Latest thread
                  </div>
                  <div className="mt-1 text-[12px] text-[var(--app-text-muted)]">No threads yet.</div>
                </div>
              )}
            </div>
          </div>
          <RecentDebugSessions />
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[6px] border border-[var(--border-default)] bg-[var(--bg-primary)] p-3">
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 rounded-[6px] bg-[var(--bg-tertiary)] border border-[var(--border-default)] flex items-center justify-center">
          <Icon className="h-4 w-4 text-[var(--text-secondary)]" />
        </div>
        <div className="text-[18px] font-semibold text-[var(--text-primary)]">{value}</div>
      </div>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">{label}</div>
      <div className="text-[12px] text-[var(--text-secondary)] mt-0.5">{sub}</div>
    </div>
  );
}
