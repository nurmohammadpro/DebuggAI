'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';

export function RenameProjectDialog({
  open,
  onOpenChange,
  projectId,
  initialName,
  onRenamed,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  initialName: string;
  onRenamed: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setName(initialName);
  }, [initialName, open]);

  const onSave = async () => {
    if (!name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from('generations')
        .update({ description: name.trim() })
        .eq('id', projectId);
      if (error) throw error;
      toast.success('Project renamed');
      onOpenChange(false);
      onRenamed();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to rename');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rename project</DialogTitle>
          <DialogDescription>Updates the project title shown in your dashboard.</DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-2 space-y-2">
          <Label htmlFor="projectRename">Name</Label>
          <Input
            id="projectRename"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

