import 'server-only';

import type { NextRequest } from 'next/server';

import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import { isEmailAdminAllowlisted } from '@/lib/admin/admin-allowlist';

export async function requireAdmin(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return { ...auth, errorResponse: auth.errorResponse };
  const user = auth.user!;

  // Temporary bootstrapping: allow env-based allowlist until DB is fully aligned.
  if (isEmailAdminAllowlisted(user.email)) {
    return { ...auth, isAdmin: true, errorResponse: null as null };
  }

  const supabaseAdmin = createSupabaseAdmin();

  // Preferred: SECURITY DEFINER function described in DeBuggAI_Backend_API_DB_Reference.md
  try {
    const { data, error } = await supabaseAdmin.rpc('is_admin', {
      p_user_id: user.id,
    });

    if (error) {
      // If function doesn't exist yet, fall through to forbidden.
      return { ...auth, isAdmin: false, errorResponse: new Response('Forbidden', { status: 403 }) };
    }

    if (!data) {
      return { ...auth, isAdmin: false, errorResponse: new Response('Forbidden', { status: 403 }) };
    }

    return { ...auth, isAdmin: true, errorResponse: null as null };
  } catch {
    return { ...auth, isAdmin: false, errorResponse: new Response('Forbidden', { status: 403 }) };
  }
}
