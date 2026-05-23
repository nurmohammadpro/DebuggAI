'use client';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/hooks/use-session';
import { queryKeys } from '@/hooks/queries/query-keys';

export type RunStepRow = {
  id: string;
  run_id: string;
  step_index: number;
  kind: string;
  agent_name: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
  input: any;
  output: any;
  error: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type ToolCallRow = {
  id: string;
  run_step_id: string;
  tool_name: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'skipped';
  input: any;
  output: any;
  error: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

export type ArtifactRow = {
  id: string;
  run_id: string;
  kind: string;
  storage_path: string | null;
  content: string | null;
  metadata: any;
  created_at: string;
};

export function useRunDetails(runId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.runDetails(runId || 'missing')] as const,
    enabled: enabled && !!runId,
    queryFn: async () => {
      const session = await getSession();
      if (!session.user) throw new Error('Not authenticated');
      if (!runId) throw new Error('Missing run id');

      const [{ data: run, error: runErr }, { data: steps, error: stepsErr }, { data: artifacts, error: artifactsErr }] =
        await Promise.all([
          supabase
            .from('runs')
            .select('id,thread_id,user_id,status,objective,error,created_at,started_at,ended_at,updated_at')
            .eq('id', runId)
            .single(),
          supabase
            .from('run_steps')
            .select('id,run_id,step_index,kind,agent_name,status,input,output,error,started_at,ended_at,created_at')
            .eq('run_id', runId)
            .order('step_index', { ascending: true }),
          supabase
            .from('artifacts')
            .select('id,run_id,kind,storage_path,content,metadata,created_at')
            .eq('run_id', runId)
            .order('created_at', { ascending: false }),
        ]);

      if (runErr) throw runErr;
      if (stepsErr) throw stepsErr;
      if (artifactsErr) throw artifactsErr;

      const stepIds = (steps || []).map((s: any) => s.id).filter(Boolean);
      let toolCalls: ToolCallRow[] = [];
      if (stepIds.length > 0) {
        const { data: tc, error: tcErr } = await supabase
          .from('tool_calls')
          .select('id,run_step_id,tool_name,status,input,output,error,started_at,ended_at,created_at')
          .in('run_step_id', stepIds)
          .order('created_at', { ascending: true });
        if (tcErr) throw tcErr;
        toolCalls = (tc || []) as any;
      }

      return {
        run: run as any,
        steps: (steps || []) as RunStepRow[],
        toolCalls,
        artifacts: (artifacts || []) as ArtifactRow[],
      };
    },
  });
}

