import 'server-only';

import type { NextRequest } from 'next/server';

import { createSupabaseUserClient } from '@/lib/server/supabase-user';

export function getBearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export function decodeSupabaseCookiePayload(raw: string) {
  const encoded = raw.startsWith('base64-') ? raw.slice('base64-'.length) : raw;
  const candidates = raw.startsWith('base64-')
    ? [
        () => Buffer.from(encoded, 'base64url').toString('utf8'),
        () => Buffer.from(encoded, 'base64').toString('utf8'),
      ]
    : [() => encoded];

  for (const decode of candidates) {
    try {
      const payload = JSON.parse(decode()) as { access_token?: string } | null;
      if (payload?.access_token) return payload.access_token;
    } catch {
      // try next decoder
    }
  }

  return null;
}

function getSupabaseAccessTokenFromCookie(req: NextRequest) {
  // Supabase SSR stores the session in a cookie named like:
  // sb-<project-ref>-auth-token
  // The value is a base64-encoded JSON object containing access_token, refresh_token, etc.
  //
  // Large sessions are chunked across multiple cookies:
  //   sb-xxx-auth-token, sb-xxx-auth-token.0, sb-xxx-auth-token.1, ...
  // We must reassemble chunks before decoding.
  const allCookies = req.cookies.getAll();

  // Find the base cookie key (the one ending with -auth-token, possibly with a chunk suffix)
  const authCookies = allCookies.filter(
    (c) => c.name.startsWith('sb-') && /-auth-token(?:\.\d+)?$/.test(c.name)
  );

  if (authCookies.length === 0) return null;

  // Group by base key and reassemble chunks in order
  const chunkGroups = new Map<string, Map<number, string>>();
  for (const cookie of authCookies) {
    const match = cookie.name.match(/^(sb-.+-auth-token)(?:\.(\d+))?$/);
    if (!match) continue;
    const baseKey = match[1]!;
    const chunkIndex = match[2] ? parseInt(match[2], 10) : 0;
    if (!chunkGroups.has(baseKey)) chunkGroups.set(baseKey, new Map());
    chunkGroups.get(baseKey)!.set(chunkIndex, cookie.value);
  }

  // Reassemble the first valid session
  for (const [, chunks] of chunkGroups) {
    const sorted = [...chunks.entries()].sort(([a], [b]) => a - b);
    const raw = sorted.map(([, v]) => v).join('');

    if (!raw) continue;
    const accessToken = decodeSupabaseCookiePayload(raw);
    if (accessToken) return accessToken;
  }

  return null;
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
