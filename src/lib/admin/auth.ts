'use server';

import { isEmailAdminAllowlisted } from '@/lib/admin/admin-allowlist';
import { requireUser } from '@/lib/server/auth';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  plan_type: string;
}

export async function verifyAdminSession(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,full_name,avatar_url,is_admin,plan_type')
    .eq('clerk_id', token)
    .single()
    .catch(() => ({ data: null }));

  if (!profile?.is_admin) return null;
  return profile as AdminUser;
}
