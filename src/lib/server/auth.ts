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
  const allCookies = req.cookies.getAll();
  const authCookies = allCookies.filter(
    (c) => c.name.startsWith('sb-') && /-auth-token(?:\.\d+)?$/.test(c.name)
  );
  if (authCookies.length === 0) return null;

  const chunkGroups = new Map<string, Map<number, string>>();
  for (const cookie of authCookies) {
    const match = cookie.name.match(/^(sb-.+-auth-token)(?:\.(\d+))?$/);
    if (!match) continue;
    const baseKey = match[1]!;
    const chunkIndex = match[2] ? parseInt(match[2], 10) : 0;
    if (!chunkGroups.has(baseKey)) chunkGroups.set(baseKey, new Map());
    chunkGroups.get(baseKey)!.set(chunkIndex, cookie.value);
  }

  for (const [, chunks] of chunkGroups) {
    const sorted = [...chunks.entries()].sort(([a], [b]) => a - b);
    const raw = sorted.map(([, v]) => v).join('');
    if (!raw) continue;
    const encoded = raw.startsWith('base64-') ? raw.slice('base64-'.length) : raw;
    for (const decode of [
      () => Buffer.from(encoded, 'base64url').toString('utf8'),
      () => Buffer.from(encoded, 'base64').toString('utf8'),
    ]) {
      try {
        const payload = JSON.parse(decode()) as { access_token?: string } | null;
        if (payload?.access_token) return payload.access_token;
      } catch {}
    }
  }
  return null;
}

/**
 * Server-side auth — works with both Clerk and Supabase tokens.
 *
 * Priority:
 * 1. Clerk JWT (from Bearer header) — verified via Clerk's auth()
 * 2. Supabase session token (from cookie or Bearer) — verified via getUser()
 *
 * Returns a unified { user, userId, token, supabase } object.
 */
export async function requireUser(req: NextRequest) {
  const token = getBearerToken(req) || getSupabaseAccessTokenFromCookie(req);
  if (!token) {
    console.warn('[auth] requireUser: no token found', {
      url: req.nextUrl?.pathname,
      method: req.method,
    });
    return { user: null, userId: null, token: null, supabase: null, errorResponse: authError(401, 'Unauthorized') };
  }

  // ── Clerk auth (when Clerk is configured) ──
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (clerkSecretKey && clerkSecretKey.length > 10) {
    try {
      const { createClerkClient } = await import('@clerk/backend');
      const clerk = createClerkClient({ secretKey: clerkSecretKey });
      const clerkUser = await clerk.users.getUser(token);

      if (clerkUser?.id) {
        const clerkUserId = clerkUser.id;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(supabaseUrl, supabaseKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });

        // Resolve the Supabase user ID from the Clerk user.
        // The profiles table may have a clerk_id column, or we map by email.
        let supabaseUserId = clerkUserId;
        const clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
        if (clerkEmail || serviceKey) {
          try {
            const adminClient = createClient(supabaseUrl, serviceKey || supabaseKey);
            const { data: profile } = await adminClient
              .from('profiles')
              .select('id')
              .or(`clerk_id.eq.${clerkUserId},email.eq.${clerkEmail}`)
              .limit(1)
              .maybeSingle();

            if (profile?.id) {
              supabaseUserId = profile.id;
              // Store the mapping for future lookups
              await adminClient.from('profiles').update({ clerk_id: clerkUserId }).eq('id', profile.id);
            } else if (clerkEmail) {
              // No profile yet — create one with the Clerk user info
              const email = clerkUser.emailAddresses?.[0]?.emailAddress || `clerk-${clerkUserId}@placeholder.dev`;
              const displayName = clerkUser.firstName || clerkUser.username || 'Developer';
              await (adminClient.from('profiles').insert({
                id: clerkUserId,
                clerk_id: clerkUserId,
                email,
                full_name: displayName,
                plan_type: 'free',
                is_admin: false,
              }) as unknown as Promise<any>).catch(() => {});
            }
          } catch {
            // best-effort — use Clerk user ID directly
          }
        }

        return {
          user: { id: supabaseUserId, email: clerkUser.emailAddresses?.[0]?.emailAddress || '', role: 'authenticated' },
          userId: supabaseUserId,
          token,
          supabase,
          errorResponse: null,
        };
      }
    } catch (err) {
      console.warn('[auth] Clerk auth failed, trying Supabase:', err instanceof Error ? err.message : String(err));
      // Fall through to Supabase auth
    }
  }

  // ── Supabase auth (fallback) ──
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
        errorMessage: error?.message,
        tokenPrefix: token.slice(0, 20),
      });
      return { user: null, userId: null, token: null, supabase: null, errorResponse: authError(401, 'Invalid or expired token') };
    }
    return { user: data.user, userId: data.user.id, token, supabase, errorResponse: null };
  } catch (err) {
    console.error('[auth] requireUser: Supabase unreachable', {
      error: err instanceof Error ? err.message : String(err),
    });
    return { user: null, userId: null, token: null, supabase: null, errorResponse: authError(503, 'Auth service unavailable') };
  }
}

function authError(status: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
