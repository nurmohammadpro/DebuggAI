'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { Plus } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProjectsFilters } from '@/components/dashboard/projects/projects-filters';
import { ProjectCard } from '@/components/dashboard/projects/project-card';
import { useMyProjects } from '@/hooks/queries/use-my-projects';
import { supabase } from '@/lib/supabase';
import { getProjectKey } from '@/lib/project/project-key';
import { RecentDebugSessions } from '@/components/dashboard/home/recent-debug-sessions';
import { RecentTransactions } from '@/components/dashboard/home/recent-transactions';
import { CreateProjectDialog } from '@/components/dashboard/projects/create-project-dialog';

export function ProjectsHub() {
  const [query, setQuery] = useState('');
  const [stack, setStack] = useState('all');

  const { data, isLoading, error, refetch } = useMyProjects(75, true);

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
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in again');
        return;
      }

      const { error: insertError } = await supabase.from('generations').insert({
        user_id: session.user.id,
        code: project.code,
        version: 1,
        description: project.description ? `Copy of ${project.description}` : 'Copy',
        stack: project.stack,
        prompt: project.prompt,
        metadata: { ...(project.metadata || {}), project_key: getProjectKey(project) },
      });

      if (insertError) throw insertError;
      toast.success('Project duplicated');
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to duplicate');
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="text-2xl font-bold tracking-tight">Projects</div>
          <div className="text-sm text-muted-foreground">
            Open a project in the workspace, or generate a new one.
          </div>
        </div>
        <CreateProjectDialog>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </CreateProjectDialog>
      </div>

      <ProjectsFilters
        query={query}
        onQueryChange={setQuery}
        stack={stack}
        onStackChange={setStack}
      />

      <div className="grid lg:grid-cols-[1fr,360px] gap-6 items-start">
        <div className="space-y-4">
          {error && (
            <Card className="p-6">
              <div className="text-sm font-medium">Failed to load projects</div>
              <div className="text-xs text-muted-foreground mt-1">
                {error instanceof Error ? error.message : 'Unknown error'}
              </div>
              <div className="mt-4">
                <Button variant="outline" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            </Card>
          )}

          {isLoading && (
            <div className="grid gap-3">
              <Card className="p-4 h-20 animate-pulse" />
              <Card className="p-4 h-20 animate-pulse" />
              <Card className="p-4 h-20 animate-pulse" />
            </div>
          )}

          {!isLoading && !error && projects.length === 0 && (
            <Card className="p-10 text-center">
              <div className="text-sm font-semibold">No projects yet</div>
              <div className="text-xs text-muted-foreground mt-1">
                Generate your first project to get started.
              </div>
            </Card>
          )}

          {!isLoading && !error && projects.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-muted-foreground">
                <div>
                  <Badge variant="outline" className="text-xs">
                    {projects.length}
                  </Badge>{' '}
                  projects
                </div>
                <div>
                  Updated{' '}
                  {formatDistanceToNowStrict(new Date(projects[0]!.created_at), {
                    addSuffix: true,
                  })}
                </div>
              </div>
              <div className="grid gap-3">
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

        <div className="space-y-4">
          <RecentDebugSessions />
          <RecentTransactions />
        </div>
      </div>
    </div>
  );
}
