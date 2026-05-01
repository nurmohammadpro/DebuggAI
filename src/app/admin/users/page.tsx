/**
 * Admin Users Page
 *
 * Enterprise-grade user management with advanced filtering, bulk actions, and real-time search.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchIcon, DownloadIcon, MoreHorizontalIcon, FilterIcon, CheckIcon, XIcon, ChevronDownIcon, MailIcon, ShieldIcon, BanIcon, CrownIcon, RefreshCwIcon } from 'lucide-react';
import { UserDetailSlideOver } from '@/components/admin/user-detail-slide-over';
import { useConfirmDialog } from '@/components/admin/confirm-dialog';
import { getAllUsers, toggleAdminStatus, banUser, adjustUserCredits } from '@/lib/admin/auth';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_admin: boolean;
  plan_type: 'free' | 'pro' | 'team' | 'business' | 'enterprise';
}

interface UsersResponse {
  users: User[];
  count: number;
  error?: string;
}

type SortField = 'created_at' | 'email' | 'plan_type' | 'last_login';
type SortOrder = 'asc' | 'desc';
type PlanFilter = 'all' | 'free' | 'pro' | 'team' | 'business' | 'enterprise';
type StatusFilter = 'all' | 'active' | 'admin' | 'banned';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // Selection state
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // UI state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const offset = (page - 1) * pageSize;
      const result: UsersResponse = await getAllUsers(pageSize, offset);

      if (result.error) {
        setError(result.error);
      } else {
        setUsers(result.users);
        setTotalCount(result.count);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedQuery, planFilter, statusFilter, sortField, sortOrder]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Filter and sort users client-side (since API doesn't support all filters yet)
  const filteredUsers = users.filter(user => {
    const matchesSearch = !debouncedQuery ||
      user.email.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(debouncedQuery.toLowerCase());

    const matchesPlan = planFilter === 'all' || user.plan_type === planFilter;
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'admin' && user.is_admin) ||
      (statusFilter === 'active' && !user.is_admin);

    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'email':
        comparison = a.email.localeCompare(b.email);
        break;
      case 'plan_type':
        comparison = a.plan_type.localeCompare(b.plan_type);
        break;
      default:
        comparison = 0;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Selection handlers
  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
    setSelectAll(newSelection.size === sortedUsers.length);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(sortedUsers.map(u => u.id)));
    }
    setSelectAll(!selectAll);
  };

  // Bulk actions
  const bulkMakeAdmin = async () => {
    for (const userId of selectedUsers) {
      await toggleAdminStatus(userId);
    }
    setSelectedUsers(new Set());
    setSelectAll(false);
    fetchUsers();
  };

  const bulkBan = async () => {
    const confirmed = await confirm(
      'Ban Multiple Users',
      `Are you sure you want to ban ${selectedUsers.size} users? This action will prevent them from accessing their accounts.`,
      {
        confirmText: 'Ban Users',
        variant: 'destructive',
      }
    );

    if (!confirmed) return;

    for (const userId of selectedUsers) {
      await banUser(userId, 'Bulk ban from admin panel');
    }
    setSelectedUsers(new Set());
    setSelectAll(false);
    fetchUsers();
  };

  const getPlanBadgeClass = (planType: string) => {
    switch (planType) {
      case 'pro': return 'bg-[#CE93D8]/15 text-[#CE93D8] border-[#CE93D8]/30';
      case 'team': return 'bg-[#40C4FF]/15 text-[#40C4FF] border-[#40C4FF]/30';
      case 'business': return 'bg-[#FFAB00]/15 text-[#FFAB00] border-[#FFAB00]/30';
      case 'enterprise': return 'bg-[#E8F5E9]/15 text-[#E8F5E9] border-[#E8F5E9]/30';
      default: return 'bg-[#1E261E] text-[#8BAD8B] border-[#1F2B1F]';
    }
  };

  const exportUsers = () => {
    const csv = [
      ['ID', 'Email', 'Name', 'Plan', 'Admin'].join(','),
      ...sortedUsers.map(u => [
        u.id,
        u.email,
        u.full_name || '',
        u.plan_type,
        u.is_admin ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#E8F5E9]">Users</h1>
          <p className="text-sm text-[#4D6B4D] mt-1">
            {totalCount.toLocaleString()} total users • {sortedUsers.length} shown
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedUsers.size > 0 && (
            <>
              <span className="text-sm text-[#8BAD8B]">
                {selectedUsers.size} selected
              </span>
              <button
                onClick={bulkMakeAdmin}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#00C853]/10 text-[#00C853] border border-[#00C853]/30 hover:bg-[#00C853]/20 transition-all font-medium text-[13.5px]"
              >
                <CrownIcon className="w-3.5 h-3.5" />
                Make Admin
              </button>
              <button
                onClick={bulkBan}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#FF5252]/10 text-[#FF5252] border border-[#FF5252]/30 hover:bg-[#FF5252]/20 transition-all font-medium text-[13.5px]"
              >
                <BanIcon className="w-3.5 h-3.5" />
                Ban Selected
              </button>
            </>
          )}
          <button
            onClick={exportUsers}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-transparent text-[#E8F5E9] border border-[#283228] hover:border-[#00C853] hover:text-[#00C853] transition-all font-medium text-[13.5px]"
          >
            <DownloadIcon className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4D6B4D]" />
          <input
            type="search"
            placeholder="Search users by email, name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#171C17] border border-[#283228] rounded-md text-[#E8F5E9] placeholder-[#4D6B4D] focus:outline-none focus:border-[#00C853] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4D6B4D] hover:text-[#E8F5E9]"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 h-10 px-4 rounded-md transition-all ${
            showFilters
              ? 'bg-[#00C853]/10 text-[#00C853] border-[#00C853]/30'
              : 'bg-[#171C17] text-[#8BAD8B] border-[#283228] hover:border-[#1F2B1F]'
          }`}
        >
          <FilterIcon className="w-3.5 h-3.5" />
          Filters
          {(planFilter !== 'all' || statusFilter !== 'all') && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#00C853]" />
          )}
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className="flex items-center gap-3 p-4 bg-[#111411] border border-[#1F2B1F] rounded-ds-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8BAD8B]">Plan:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
              className="h-8 px-3 bg-[#171C17] border border-[#283228] rounded-md text-[#E8F5E9] text-sm focus:outline-none focus:border-[#00C853]"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="team">Team</option>
              <option value="business">Business</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8BAD8B]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="h-8 px-3 bg-[#171C17] border border-[#283228] rounded-md text-[#E8F5E9] text-sm focus:outline-none focus:border-[#00C853]"
            >
              <option value="all">All Users</option>
              <option value="active">Regular Users</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-[#8BAD8B]">Sort by:</span>
            <select
              value={`${sortField}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortField(field as SortField);
                setSortOrder(order as SortOrder);
              }}
              className="h-8 px-3 bg-[#171C17] border border-[#283228] rounded-md text-[#E8F5E9] text-sm focus:outline-none focus:border-[#00C853]"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="email-asc">Email (A-Z)</option>
              <option value="email-desc">Email (Z-A)</option>
              <option value="plan_type-asc">Plan Type</option>
            </select>
          </div>

          {(planFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setPlanFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs text-[#FF5252] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-[#FF5252]/10 border border-[#FF5252]/30 rounded-ds-xl">
          <XIcon className="w-5 h-5 text-[#FF5252]" />
          <p className="text-sm text-[#FF5252]">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-[#111411] border border-[#1F2B1F] rounded-ds-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-5 py-3 bg-[#0A0D0A] border-b border-[#1F2B1F] text-xs font-medium text-[#8BAD8B] uppercase tracking-wider">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-[#283228] bg-[#171C17] text-[#00C853] focus:ring-0 focus:ring-offset-0"
            />
          </div>
          <div className="col-span-4">User</div>
          <div className="col-span-2">Plan</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Joined</div>
          <div className="col-span-1">Actions</div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-[#8BAD8B]">
              <RefreshCwIcon className="w-5 h-5 animate-spin" />
              <span>Loading users...</span>
            </div>
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <SearchIcon className="w-12 h-12 text-[#4D6B4D] mb-3" />
            <p className="text-sm text-[#8BAD8B]">No users found</p>
            <p className="text-xs text-[#4D6B4D] mt-1">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1F2B1F]">
            {sortedUsers.map((user) => (
              <div
                key={user.id}
                className="grid grid-cols-12 gap-4 px-5 py-3 hover:bg-[#171C17] transition-colors group cursor-pointer"
                onClick={() => setSelectedUser(user)}
              >
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedUsers.has(user.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleUserSelection(user.id);
                    }}
                    className="w-4 h-4 rounded border-[#283228] bg-[#171C17] text-[#00C853] focus:ring-0 focus:ring-offset-0"
                  />
                </div>

                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#1E261E] flex items-center justify-center text-[#8BAD8B] text-xs font-semibold flex-shrink-0">
                    {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#E8F5E9] truncate">{user.full_name || 'Unnamed User'}</p>
                    <p className="text-xs text-[#8BAD8B] truncate">{user.email}</p>
                  </div>
                </div>

                <div className="col-span-2 flex items-center">
                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getPlanBadgeClass(user.plan_type)}`}>
                    {user.plan_type.charAt(0).toUpperCase() + user.plan_type.slice(1)}
                  </span>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  {user.is_admin ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[#FFAB00]/15 text-[#FFAB00] border border-[#FFAB00]/30">
                      <ShieldIcon className="w-3 h-3" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-[#00C853]/15 text-[#00C853] border border-[#00C853]/30">
                      <CheckIcon className="w-3 h-3" />
                      Active
                    </span>
                  )}
                </div>

                <div className="col-span-2 flex items-center text-xs text-[#4D6B4D]">
                  {new Date().toLocaleDateString()}
                </div>

                <div className="col-span-1 flex items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionMenu(actionMenu === user.id ? null : user.id);
                    }}
                    className="p-1.5 rounded-md hover:bg-[#1F2B1F] transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontalIcon className="w-4 h-4 text-[#8BAD8B]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && sortedUsers.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 bg-[#0A0D0A] border-t border-[#1F2B1F]">
            <p className="text-xs text-[#4D6B4D]">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount.toLocaleString()} users
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-[#171C17] text-[#E8F5E9] hover:bg-[#1F2B1F] transition-colors"
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-xs text-[#8BAD8B]">
                Page {page} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= Math.ceil(totalCount / pageSize)}
                className="px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-[#171C17] text-[#E8F5E9] hover:bg-[#1F2B1F] transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Slide-over */}
      {selectedUser && (
        <UserDetailSlideOver
          user={{
            ...selectedUser,
            username: null,
            avatar_url: null,
            is_ambassador: false,
            referral_code: '',
            zero_knowledge_mode: false,
            last_login_at: null,
            created_at: new Date().toISOString(),
          }}
          wallet={{ id: 'temp', balance: 0 }}
          onClose={() => setSelectedUser(null)}
          onUpdate={fetchUsers}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialogComponent />
    </div>
  );
}
