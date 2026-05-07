'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, Shield, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
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

function TableRowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-4 px-4 py-3">
      <div className="h-7 w-7 rounded-full bg-[var(--app-surface)]" />
      <div className="flex-1 space-y-1">
        <div className="h-3.5 w-32 rounded bg-[var(--app-surface)]" />
        <div className="h-3 w-24 rounded bg-[var(--app-surface)]" />
      </div>
      <div className="h-5 w-14 rounded-full bg-[var(--app-surface)]" />
      <div className="h-5 w-14 rounded-full bg-[var(--app-surface)]" />
      <div className="h-7 w-7 rounded bg-[var(--app-surface)]" />
    </div>
  );
}

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

  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editPlan, setEditPlan] = useState<string>('free');
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const planBadgeClass = (plan: string) => {
    switch (plan) {
      case 'pro':
        return 'bg-[var(--app-purple-soft)] text-[var(--app-purple)] border-[var(--app-purple)]/20';
      case 'enterprise':
        return 'bg-[var(--app-info-soft)] text-[var(--app-info)] border-[var(--app-info)]/20';
      default:
        return 'bg-[var(--app-surface)] text-[var(--app-text-muted)] border-[var(--app-border)]';
    }
  };

  if (isLoading) return <AdminLoading />;

  if (error) {
    return (
      <div>
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
    <div>
      <div className="overflow-hidden rounded-[8px] bg-[var(--app-panel)] backdrop-blur-xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--app-border)] p-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-normal text-[var(--app-text)]">User Management</h3>
            <span className="text-xs text-[var(--app-text-dim)]">{total} total</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--app-text-dim)]" />
              <input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-48 rounded-[8px] border-0 bg-[var(--app-panel-2)] pl-8 text-xs text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] outline-none focus:ring-2 focus:ring-[var(--app-accent)]/20"
              />
            </div>
            <div className="flex gap-0.5 rounded-[8px] bg-[var(--app-panel-2)] p-1">
              {(['all', 'free', 'pro', 'enterprise'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setPlanFilter(r)}
                  className={`rounded-[6px] px-2.5 py-1.5 text-[11px] font-normal capitalize transition-colors ${
                    planFilter === r
                      ? 'bg-[var(--app-surface)] text-[var(--app-text)]'
                      : 'text-[var(--app-text-muted)] hover:text-[var(--app-text)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-2">
          {users.length === 0 ? (
            <div className="py-12 text-center">
              <Shield className="mx-auto mb-3 h-10 w-10 text-[var(--app-text-dim)]" />
              <p className="text-sm text-[var(--app-text-muted)]">
                {searchQuery ? 'No users match your search' : 'No users yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--app-border)]">
              {/* Column headers - hidden on mobile */}
              <div className="hidden gap-3 px-3 py-2 text-[11px] font-normal uppercase tracking-[0.12em] text-[var(--app-text-dim)] sm:grid sm:grid-cols-[1fr_90px_80px_80px_40px]">
                <span>User</span>
                <span>Plan</span>
                <span>Role</span>
                <span>Joined</span>
                <span />
              </div>

              {users.map((user) => (
                <div
                  key={user.id}
                  className="group grid gap-3 rounded-[10px] px-3 py-3 transition-colors hover:bg-[var(--app-surface-subtle)] sm:grid-cols-[1fr_90px_80px_80px_40px] sm:items-center"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--app-surface)] text-xs font-medium text-[var(--app-text-muted)]">
                      {(user.full_name || user.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-normal text-[var(--app-text)]">
                        {user.full_name || '—'}
                      </p>
                      <p className="truncate text-xs text-[var(--app-text-muted)]">{user.email}</p>
                    </div>
                  </div>

                  {/* Plan */}
                  <div className="flex items-center gap-2 sm:block">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)] sm:hidden">Plan</span>
                    <span
                      className={`inline-flex items-center rounded-[6px] border px-2 py-0.5 text-[11px] font-normal capitalize ${planBadgeClass(user.plan)}`}
                    >
                      {user.plan}
                    </span>
                  </div>

                  {/* Role */}
                  <div className="flex items-center gap-2 sm:block">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)] sm:hidden">Role</span>
                    {user.is_admin ? (
                      <span className="inline-flex items-center gap-1 rounded-[6px] border-0 bg-[var(--app-accent-soft)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-accent)]">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-[6px] border border-[var(--app-border)] px-2 py-0.5 text-[11px] font-normal text-[var(--app-text-muted)]">
                        User
                      </span>
                    )}
                  </div>

                  {/* Joined */}
                  <div className="flex items-center gap-2 sm:block">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--app-text-dim)] sm:hidden">Joined</span>
                    <span className="text-xs text-[var(--app-text-muted)]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() => onEdit(user)}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--app-text-dim)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
                      title="Edit"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setDeleteUser(user)}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[var(--app-text-dim)] transition-colors hover:bg-[var(--app-danger-soft)] hover:text-[var(--app-danger)]"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AdminPagination
        page={page}
        pages={pages}
        onPrev={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(pages, p + 1))}
      />

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-md rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-5 text-[var(--app-text)] backdrop-blur-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-sm font-medium text-[var(--app-text)]">Edit user</DialogTitle>
            <DialogDescription className="text-sm font-light text-[var(--app-text-muted)]">
              Update plan and admin status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm">
              <div className="font-medium">{editUser?.email}</div>
              <div className="text-xs text-[var(--app-text-dim)] font-mono">{editUser?.id}</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--app-text-muted)]">Plan</label>
              <Select value={editPlan} onValueChange={(v) => setEditPlan(v || 'free')}>
                <SelectTrigger className="rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-[8px] border-[var(--app-border)] bg-[var(--app-panel-2)]">
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-2.5">
              <span className="text-sm text-[var(--app-text)]">Admin access</span>
              <button
                onClick={() => setEditIsAdmin(!editIsAdmin)}
                className={`relative h-5 w-9 rounded-full transition-colors ${editIsAdmin ? 'bg-[var(--app-accent)]' : 'bg-[var(--app-surface)]'}`}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${editIsAdmin ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
          </div>
          <DialogFooter className="flex-row justify-end gap-2">
            <button
              onClick={() => setEditUser(null)}
              disabled={saving}
              className="rounded-[8px] px-4 py-2 text-sm font-normal text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
            >
              Cancel
            </button>
            <button
              onClick={onSaveEdit}
              disabled={saving}
              className="rounded-[8px] bg-[var(--app-accent)] px-4 py-2 text-sm font-medium text-black transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <DialogContent className="max-w-md rounded-[10px] border border-[var(--app-border)] bg-[var(--app-panel-2)] p-5 text-[var(--app-text)] backdrop-blur-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-sm font-medium text-[var(--app-text)]">Delete user</DialogTitle>
            <DialogDescription className="text-sm font-light text-[var(--app-text-muted)]">
              This permanently deletes{' '}
              <span className="font-medium text-[var(--app-text)]">{deleteUser?.email}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <button
              onClick={() => setDeleteUser(null)}
              disabled={deleting}
              className="rounded-[8px] px-4 py-2 text-sm font-normal text-[var(--app-text-muted)] transition-colors hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmDelete}
              disabled={deleting}
              className="rounded-[8px] bg-[var(--app-danger)] px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
