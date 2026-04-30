'use client';

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/queries/query-keys';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/hooks/use-session';

export interface MeProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  is_admin: boolean;
}

export function useMeProfile(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    enabled,
    queryFn: async (): Promise<MeProfile | null> => {
      const session = await getSession();
      if (!session.user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('id,email,full_name,avatar_url,plan,is_admin')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;
      return data as MeProfile;
    },
  });
}

