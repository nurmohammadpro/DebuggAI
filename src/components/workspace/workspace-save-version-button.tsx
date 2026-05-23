'use client';

import { forwardRef, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { useGenerationStore } from '@/store/generation-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { queryKeys } from '@/hooks/queries/query-keys';
import { cn } from '@/lib/utils';

export const WorkspaceSaveVersionButton = forwardRef<
  HTMLButtonElement,
  { className?: string }
>(function WorkspaceSaveVersionButton({ className }, ref) {
  const queryClient = useQueryClient();
  const { projectKey, selectedProjectId } = useWorkspaceStore();
  const { getProjectCode, markSaved } = useGenerationStore();
  const [saving, setSaving] = useState(false);

  const disabled = !projectKey || !selectedProjectId || saving;

  const onSave = async () => {
    if (!projectKey) return;
    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in again');
        return;
      }

      const code = getProjectCode();
      const description = `Saved ${new Date().toLocaleString()}`;

      // Query max version for this project and increment
      const { data: latest } = await supabase
        .from('generations')
        .select('version')
        .eq('project_id', selectedProjectId)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const nextVersion = (latest?.version || 0) + 1;

      const { error } = await supabase.from('generations').insert({
        user_id: session.user.id,
        code,
        version: nextVersion,
        description,
        project_id: selectedProjectId,
        metadata: { project_key: projectKey },
      });

      if (error) throw error;

      toast.success('Version saved');
      markSaved(code);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.projectVersions(projectKey),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save version');
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      ref={ref}
      className={cn(
        "h-8 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight transition-all border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed",
        className
      )}
      onClick={onSave}
      disabled={disabled}
      title={disabled ? 'Select a project to save versions' : 'Save version'}
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Save className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline">Save</span>
    </button>
  );
});
