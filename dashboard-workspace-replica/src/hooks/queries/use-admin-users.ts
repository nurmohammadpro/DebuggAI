'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { getAdminAuthHeaders } from '@/hooks/queries/use-admin-auth';

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  is_admin: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUsersResponse = {
  users: AdminUserRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
};

export function useAdminUsers(
  params: { page: number; limit: number; search?: string; plan?: string },
  enabled = true
) {
  const queryString = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    ...(params.search ? { search: params.search } : {}),
    ...(params.plan && params.plan !== 'all' ? { plan: params.plan } : {}),
  }).toString();

  return useQuery({
    queryKey: queryKeys.adminUsers(queryString),
    enabled,
    queryFn: async (): Promise<AdminUsersResponse> => {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`/api/admin/users?${queryString}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load users');
      return json as AdminUsersResponse;
    },
  });
}

