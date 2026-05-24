import 'server-only';

import type { NextRequest } from 'next/server';

import { createSupabaseUserClient } from '@/lib/server/supabase-user';

export function getBearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

function getSupabaseAccessTokenFromCookie(req: NextRequest) {
  // Supabase SSR stores the session in a cookie named like:
  // sb-<project-ref>-auth-token
  // The value is a base64-encoded JSON object containing access_token, refresh_token, etc.
  const cookies = req.cookies.getAll();
  const authCookie = cookies.find((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'));
  if (!authCookie?.value) return null;

  let raw = authCookie.value;
  if (raw.startsWith('base64-')) raw = raw.slice('base64-'.length);

  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    const payload = JSON.parse(decoded) as { access_token?: string } | null;
    return payload?.access_token || null;
  } catch {
    return null;
  }
}

export async function requireUser(req: NextRequest) {
  const token = getBearerToken(req) || getSupabaseAccessTokenFromCookie(req);
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
