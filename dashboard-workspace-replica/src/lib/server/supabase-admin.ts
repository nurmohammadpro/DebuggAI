import 'server-only';

import { createClient } from '@supabase/supabase-js';

function requireEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export function createSupabaseAdmin() {
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return createClient(
    requireEnv('SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)', url),
    requireEnv('SUPABASE_SERVICE_ROLE_KEY', serviceKey)
  );
}
