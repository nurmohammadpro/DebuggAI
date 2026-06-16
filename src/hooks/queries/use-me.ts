'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/clerk-safe';

export interface MeProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'team' | 'business' | 'enterprise';
  is_admin: boolean;
}

export function useMeProfile(enabled = true) {
  const { user: clerkUser } = useUser();

  return useQuery({
    queryKey: queryKeys.me,
    enabled: enabled && !!clerkUser,
    queryFn: async (): Promise<MeProfile | null> => {
      if (!clerkUser?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,avatar_url,plan_type,is_admin')
        .eq('id', clerkUser.id)
        .single();

      if (error) throw error;
      const effectivePlan = (data as any).is_admin ? 'enterprise' : ((data as any).plan_type || 'free');
      return {
        ...data,
        plan: effectivePlan,
      } as MeProfile;
    },
  });
}
