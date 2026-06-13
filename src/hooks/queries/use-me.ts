'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/clerk-safe';
import { getClerkToken } from '@/lib/clerk-token';

export interface MeProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'team' | 'business' | 'enterprise';
  is_admin: boolean;
}

export function useMeProfile(enabled = true) {
  const { user: sessionUser } = useUser();

  return useQuery({
    queryKey: queryKeys.me,
    enabled: enabled && !!sessionUser,
    queryFn: async (): Promise<MeProfile | null> => {
      const token = getClerkToken();
      if (!token) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,avatar_url,plan_type,is_admin')
        .eq('id', sessionUser!.id)
        .single();

      if (error) return null;
      const effectivePlan = (data as any)?.is_admin ? 'enterprise' : ((data as any)?.plan_type || 'free');
      const profile = {
        id: (data as any)?.id,
        email: (data as any)?.email,
        full_name: (data as any)?.full_name,
        avatar_url: (data as any)?.avatar_url,
        plan: effectivePlan,
        is_admin: (data as any)?.is_admin ?? false,
      };
      return profile as MeProfile;
    },
  });
}
