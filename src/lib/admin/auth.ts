'use server';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  plan_type: string;
}

export async function verifyAdminSession() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value
    || cookieStore.get('supabase-auth-token')?.value;

  if (!token) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: { user: authUser } } = await supabase.auth.getUser(token);
  if (!authUser) return null;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,avatar_url,is_admin,plan_type')
    .eq('id', authUser.id)
    .single();

  if (error || !profile?.is_admin) return null;
  return profile as AdminUser;
}
