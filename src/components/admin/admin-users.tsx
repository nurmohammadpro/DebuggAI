'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Shield, ShieldAlert, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

import { AdminPageHeader } from '@/components/admin/admin-page-header';
import { AdminLoading } from '@/components/admin/admin-loading';
import { AdminError } from '@/components/admin/admin-error';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { useAdminUsers, type AdminUserRow } from '@/hooks/queries/use-admin-users';
import { getAdminAuthHeaders } from '@/hooks/queries/use-admin-auth';

export function AdminUsers() {
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading, error, refetch } = useAdminUsers(
    { page, limit: 20, search: searchQuery || undefined, plan: planFilter },
    true
  );

  const users = data?.users || [];
  const pages = data?.pagination.pages || 1;
  const total = data?.pagination.total || 0;

  // Edit modal state
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editPlan, setEditPlan] = useState<string>('free');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirmation state
  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [planFilter, searchQuery]);

  const onEdit = (u: AdminUserRow) => {
    setEditUser(u);
    setEditPlan(u.plan);
    setEditIsAdmin(u.is_admin);
  };

  const onSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          userId: editUser.id,
          plan: editPlan,
          is_admin: editIsAdmin,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to update user');
      toast.success('User updated');
      setEditUser(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = async () => {
    if (!deleteUser) return;
    setDeleting(true);
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`/api/admin/users?userId=${deleteUser.id}`, {
        method: 'DELETE',
        headers,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to delete user');
      toast.success('User deleted');
      setDeleteUser(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const planBadge = useMemo(
    () => (plan: string) =>
      plan === 'pro' ? 'green' : plan === 'enterprise' ? 'purple' : 'gray',
    []
  );

  if (isLoading) return <AdminLoading />;

  if (error) {
    return (
      <div className="p-6 max-w-6xl">
        <AdminPageHeader title="User Management" description="Manage users, plans, and permissions" />
        <AdminError
          title="Failed to load users"
          message={error instanceof Error ? error.message : 'Unknown error'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <AdminPageHeader
        title="User Management"
        description={`Total: ${total}`}
        right={
          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search email or name…"
              className="w-[240px]"
            />
            <Select value={planFilter} onValueChange={(v) => setPlanFilter(v || 'all')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {users.length === 0 ? (
        <Card className="p-10 text-center">
          <div className="text-sm font-semibold">No users</div>
          <div className="text-xs text-muted-foreground mt-1">
            Try adjusting filters.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="font-medium truncate">{u.email}</div>
                    <Badge variant={planBadge(u.plan) as any} className="text-xs">
                      {u.plan}
                    </Badge>
                    {u.is_admin ? (
                      <Badge variant="outline" className="text-xs inline-flex items-center gap-1">
                        <Shield className="h-3.5 w-3.5" />
                        admin
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {u.full_name || '—'} • Created {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => onEdit(u)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteUser(u)}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AdminPagination
        page={page}
        pages={pages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pages, p + 1))}
      />

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update plan and admin status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm">
              <div className="font-medium">{editUser?.email}</div>
              <div className="text-xs text-muted-foreground">{editUser?.id}</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Plan</div>
              <Select value={editPlan} onValueChange={(v) => setEditPlan(v || 'free')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between border border-border/40 rounded-md px-3 py-2">
              <div className="text-sm flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                Admin access
              </div>
              <input
                type="checkbox"
                checked={editIsAdmin}
                onChange={(e) => setEditIsAdmin(e.target.checked)}
                className="h-4 w-4"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={onSaveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>
              This permanently deletes <span className="font-medium">{deleteUser?.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteUser(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={onConfirmDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
