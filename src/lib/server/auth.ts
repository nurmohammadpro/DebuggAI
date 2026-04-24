import 'server-only';

import type { NextRequest } from 'next/server';

import { createSupabaseUserClient } from '@/lib/server/supabase-user';

export function getBearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export async function requireUser(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return { user: null, token: null, errorResponse: new Response('Unauthorized', { status: 401 }) };
  }

  const supabase = createSupabaseUserClient(token);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    return { user: null, token: null, errorResponse: new Response('Unauthorized', { status: 401 }) };
  }

  return { user: data.user, token, supabase, errorResponse: null };
}

