'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Code2, Plus, Loader2 } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  const [selectedStack, setSelectedStack] = useState<string>('mern');
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

      const { id } = await createProjectFromGeneration({
        userId: session.user.id,
        name: name.trim(),
        stack: selectedStack,
        prompt: `Create a ${selectedStack.toUpperCase()} app: ${name.trim()}`,
        createdFrom: 'dashboard-dialog',
      });

      toast.success('Project created');
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
        <DialogTrigger className="btn group/button inline-flex shrink-0 items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2">
          {children}
        </DialogTrigger>
      ) : null}
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            New Project
          </DialogTitle>
          <DialogDescription>
            Creates a new project row (from `generations`) and opens it in the workspace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project name</Label>
            <Input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My next app"
              className="w-full"
            />
          </div>

          <div className="space-y-3">
            <Label>Stack</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WEB_BUILDER_STACKS.map((stack) => (
                <Card
                  key={stack.id}
                  className={`cursor-pointer transition-all hover:shadow-sm ${
                    selectedStack === stack.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedStack(stack.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{stack.icon}</span>
                        <h3 className="font-semibold">{stack.name}</h3>
                      </div>
                      {selectedStack === stack.id && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{stack.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border/40">
            <div className="text-xs text-muted-foreground">
              {stackMeta ? (
                <>
                  <Badge variant="outline" className="text-xs">
                    {stackMeta.id.toUpperCase()}
                  </Badge>
                  <span className="ml-2">{stackMeta.name}</span>
                </>
              ) : null}
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={creating} className="flex-1 sm:flex-none">
                Cancel
              </Button>
              <Button onClick={onCreate} disabled={creating} className="flex-1 sm:flex-none">
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
