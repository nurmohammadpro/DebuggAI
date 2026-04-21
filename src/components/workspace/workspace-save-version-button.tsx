'use client';

import { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { useGenerationStore } from '@/store/generation-store';
import { useWorkspaceStore } from '@/store/workspace-store';
import { queryKeys } from '@/hooks/queries/query-keys';

export function WorkspaceSaveVersionButton() {
  const queryClient = useQueryClient();
  const { projectKey, selectedProjectId } = useWorkspaceStore();
  const { getProjectCode } = useGenerationStore();
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

      const { error } = await supabase.from('generations').insert({
        user_id: session.user.id,
        code,
        version: 1,
        description,
        metadata: { project_key: projectKey },
      });

      if (error) throw error;

      toast.success('Version saved');
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
    <Button
      variant="outline"
      className="h-8 px-3 rounded-full text-xs"
      onClick={onSave}
      disabled={disabled}
      title={disabled ? 'Select a project to save versions' : 'Save version'}
    >
      {saving ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Save className="h-3.5 w-3.5" />
      )}
      <span className="hidden sm:inline ml-2">Save</span>
    </Button>
  );
}

