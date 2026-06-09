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
    console.warn('[auth] requireUser: no token found', {
      url: req.nextUrl?.pathname,
      method: req.method,
      hasCsrfCookie: !!req.cookies.get('csrf_token')?.value,
    });
    return { user: null, token: null, errorResponse: new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }) };
  }

  // getUser() makes an HTTP call to Supabase's auth server.
  // Without a timeout, a slow/unreachable Supabase hangs the
  // entire request indefinitely — producing the "Creating..."
  // spinner forever in the client. We race against a 10s timer.
  const supabase = createSupabaseUserClient(token);
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout — Supabase unreachable')), 10_000)
      ),
    ]);
    const { data, error } = result;
    if (error || !data?.user) {
      console.warn('[auth] requireUser: getUser failed', {
        url: req.nextUrl?.pathname,
        method: req.method,
        errorMessage: error?.message || 'no user returned',
        errorStatus: (error as { status?: number } | null)?.status,
        tokenPrefix: token.slice(0, 20) + '...',
        tokenLength: token.length,
      });
      return { user: null, token: null, errorResponse: new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }) };
    }
    return { user: data.user, token, supabase, errorResponse: null };
  } catch (err) {
    console.error('[auth] requireUser: Supabase unreachable', {
      url: req.nextUrl?.pathname,
      method: req.method,
      error: err instanceof Error ? err.message : String(err),
    });
    return { user: null, token: null, errorResponse: new Response(JSON.stringify({ error: 'Auth service unavailable — please try again' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }) };
  }
}
