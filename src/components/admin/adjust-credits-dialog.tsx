'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Minus, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getAdminAuthHeaders } from '@/hooks/queries/use-admin-auth';
import { queryKeys } from '@/hooks/queries/query-keys';

export function AdjustCreditsDialog({
  open,
  onOpenChange,
  onAdjusted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdjusted: () => void;
}) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('10');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resolvedAmount = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n)) return 0;
    return Math.trunc(n);
  }, [amount]);

  const resolveUserIdByEmail = async (targetEmail: string) => {
    const headers = await getAdminAuthHeaders();
    const params = new URLSearchParams({
      page: '1',
      limit: '20',
      search: targetEmail,
    });
    const res = await fetch(`/api/admin/users?${params.toString()}`, { headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || 'Failed to resolve user');
    const users = (json.users || []) as Array<{ id: string; email: string }>;
    const exact = users.find((u) => u.email?.toLowerCase() === targetEmail.toLowerCase());
    return (exact || users[0])?.id || null;
  };

  const onSubmit = async () => {
    if (!email.trim() || !description.trim() || resolvedAmount === 0) {
      toast.error('Fill email, amount, and reason');
      return;
    }

    setSubmitting(true);
    try {
      const userId = await resolveUserIdByEmail(email.trim());
      if (!userId) {
        toast.error('User not found');
        return;
      }

      const headers = await getAdminAuthHeaders();
      const res = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          userId,
          amount: resolvedAmount,
          description: description.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to adjust credits');

      toast.success('Credits adjusted');
      onOpenChange(false);
      setEmail('');
      setAmount('10');
      setDescription('');

      await queryClient.invalidateQueries({ queryKey: queryKeys.adminCredits('') });
      onAdjusted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to adjust credits');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust user credits</DialogTitle>
          <DialogDescription>
            Adds or removes credits from a user’s wallet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="adminAdjustEmail">User email</Label>
            <Input
              id="adminAdjustEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="adminAdjustAmount">Amount</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setAmount(String(-Math.abs(Number(amount) || 0)))}
                title="Make negative"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="adminAdjustAmount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setAmount(String(Math.abs(Number(amount) || 0)))}
                title="Make positive"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Positive adds credits, negative removes credits.
            </p>
          </div>

          <div>
            <Label htmlFor="adminAdjustReason">Reason</Label>
            <Textarea
              id="adminAdjustReason"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Refund for service interruption"
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Adjust
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

