'use client';

import { useState, useEffect, useCallback } from 'react';
import { Rocket, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Deployment {
  id: string;
  environment: string;
  provider: string;
  status: string;
  deployment_url: string | null;
  commit_sha: string | null;
  created_at: string;
  completed_at: string | null;
}

export function WorkspaceDeployments({ projectId }: { projectId: string }) {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);

  const statusColor = (status: string) => {
    switch (status) {
      case 'success': return 'var(--app-success)';
      case 'building': return 'var(--app-warning)';
      case 'failed': return 'var(--app-danger)';
      default: return 'var(--app-text-dim)';
    }
  };

  const fetchDeployments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Use admin client on server — for client, use supabase directly
      const { data, error } = await supabase
        .from('deployments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error) setDeployments(data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--app-text-dim)]" />
      </div>
    );
  }

  if (deployments.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <Rocket className="h-8 w-8 text-[var(--app-text-dim)] mb-3" />
        <div className="text-[13px] font-medium text-[var(--app-text)] mb-1">Deployments</div>
        <div className="text-[11px] text-[var(--app-text-muted)] max-w-[260px]">
          No deployments yet. Start a build to see deployment history.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--app-border)]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-muted)]">
          Deployments
        </span>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {deployments.map((d) => (
          <div
            key={d.id}
            className="px-3 py-2.5 rounded-[8px] hover:bg-[var(--app-surface)] transition-colors border border-transparent hover:border-[var(--app-border)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: statusColor(d.status) }}
                />
                <span className="text-[12px] text-[var(--app-text)] capitalize">{d.environment}</span>
              </div>
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-[4px]"
                style={{
                  background: `${statusColor(d.status)}15`,
                  color: statusColor(d.status),
                }}
              >
                {d.status}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-[var(--app-text-dim)]">{d.provider}</span>
              <span className="text-[10px] text-[var(--app-text-dim)]">
                {new Date(d.created_at).toLocaleDateString()}
              </span>
            </div>
            {d.deployment_url && (
              <a
                href={d.deployment_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[var(--app-accent)] mt-1 block truncate hover:underline"
              >
                {d.deployment_url}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
