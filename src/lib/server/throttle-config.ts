import 'server-only';

import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function getThrottleFlag(
  key: string,
  fallback: boolean
): Promise<boolean> {
  try {
    const supabase = createSupabaseAdmin();
    const { data, error } = await supabase
      .from('throttle_config')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    if (error) return fallback;
    const v = (data?.value || '').trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes') return true;
    if (v === 'false' || v === '0' || v === 'no') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

