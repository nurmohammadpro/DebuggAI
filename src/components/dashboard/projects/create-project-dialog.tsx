'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Code2, Plus, Loader2 } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { WEB_BUILDER_STACKS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { createProjectFromGeneration } from '@/lib/projects/create-project';

export function CreateProjectDialog({
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = controlledOnOpenChange ?? setUncontrolledOpen;
  const [name, setName] = useState('New Project');
  const [selectedStack, setSelectedStack] = useState<string>('nextjs');
  const [creating, setCreating] = useState(false);

  const stackMeta = useMemo(
    () => WEB_BUILDER_STACKS.find((s) => s.id === selectedStack) || null,
    [selectedStack]
  );

  const onCreate = async () => {
    if (!name.trim()) {
      toast.error('Please enter a project name');
      return;
    }

    setCreating(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error('Please sign in again');
        return;
      }

      const startedAt = performance.now();
      const { id, durationMs } = await createProjectFromGeneration({
        name: name.trim(),
        stack: selectedStack,
        prompt: `Create a Next.js App Router app: ${name.trim()}`,
        createdFrom: 'dashboard-dialog',
      });

      const clientDurationMs = Math.round(performance.now() - startedAt);
      const serverDurationMs = typeof durationMs === 'number' ? Math.round(durationMs) : null;
      toast.success(
        serverDurationMs != null
          ? `Project created in ${serverDurationMs}ms (server), ${clientDurationMs}ms total`
          : `Project created in ${clientDurationMs}ms`
      );
      setOpen(false);
      router.push(`/dashboard?project=${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[8px] bg-[var(--ds-green)] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[var(--ds-green-bright)]">
          {children}
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-3xl rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-5 text-[var(--app-text)] backdrop-blur-xl">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-[16px] font-medium text-[var(--app-text)]">
            <Code2 className="h-5 w-5" />
            New Project
          </DialogTitle>
          <DialogDescription className="text-[13px] text-[var(--app-text-muted)]">
            Creates a new project and opens it in the workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-1.5">
            <label htmlFor="projectName" className="text-[13px] font-medium text-[var(--app-text-muted)]">Project name</label>
            <input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My next app"
              className="w-full h-9 rounded-[8px] border-0 bg-[var(--app-panel)] px-3 text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[13px] font-medium text-[var(--app-text-muted)]">Stack</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WEB_BUILDER_STACKS.map((stack) => (
                <div
                  key={stack.id}
                  className={`cursor-pointer rounded-[8px] bg-[var(--app-panel)] p-4 transition-all ${
                    selectedStack === stack.id ? 'ring-2 ring-[var(--app-accent)]' : ''
                  }`}
                  onClick={() => setSelectedStack(stack.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{stack.icon}</span>
                      <h3 className="text-[13px] font-medium text-[var(--app-text)]">{stack.name}</h3>
                    </div>
                    {selectedStack === stack.id && (
                      <span className="inline-flex rounded-[6px] bg-[var(--app-accent-soft)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-accent)]">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-[13px] text-[var(--app-text-muted)]">{stack.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-[var(--app-border)]">
            <div className="text-xs text-[var(--app-text-muted)]">
              {stackMeta ? (
                <>
                  <span className="inline-flex rounded-[6px] border border-[var(--app-border)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-text-muted)]">
                    {stackMeta.id.toUpperCase()}
                  </span>
                  <span className="ml-2">{stackMeta.name}</span>
                </>
              ) : null}
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setOpen(false)}
                disabled={creating}
                className="flex-1 sm:flex-none rounded-[8px] px-4 py-2 text-[13px] text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={onCreate}
                disabled={creating}
                className="flex-1 sm:flex-none inline-flex items-center gap-2 rounded-[8px] bg-[var(--ds-green)] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[var(--ds-green-bright)] disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
