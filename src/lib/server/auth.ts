import 'server-only';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    } catch {}
  }
  return null;
}

export function getBearerToken(req: NextRequest) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  return header?.match(/^Bearer\s+(.+)$/i)?.[1] || null;
}

/**
 * Verify the user's Supabase JWT and return their profile.
 *
 * All API routes use this as their auth guard. It:
 * 1. Extracts the Bearer token from the Authorization header
 * 2. Verifies it with Supabase Auth (getUser)
 * 3. Looks up the user's profile in the profiles table
 * 4. Returns { user, userId, token, supabase } for downstream use
 */
export async function requireUser(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return {
      user: null, userId: null, token: null, supabase: null,
      errorResponse: new Response(JSON.stringify({ error: 'Missing authorization token' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !authUser) {
      return {
        user: null, userId: null, token: null, supabase: null,
        errorResponse: new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { 'Content-Type': 'application/json' },
        }),
      };
    }

    // Look up the profile — create one if it doesn't exist (first sign-in)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, plan_type, is_admin')
      .eq('id', authUser.id)
      .maybeSingle();

    if (!profile) {
      // First sign-in: create profile via the handle_new_user trigger would've
      // done this, but create one just in case the trigger missed it.
      const email = authUser.email || '';
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email,
          full_name: authUser.user_metadata?.full_name || email.split('@')[0] || 'Developer',
          plan_type: 'free',
          is_admin: false,
        })
        .select('id, email, full_name, avatar_url, plan_type, is_admin')
        .single();

      if (newProfile) {
        return {
          user: { id: newProfile.id, email: newProfile.email || '' },
          userId: newProfile.id,
          token,
          supabase,
          errorResponse: null,
        };
      }
    }

    const p = profile || null;
    return {
      user: { id: authUser.id, email: authUser.email || '' },
      userId: authUser.id,
      token,
      supabase,
      errorResponse: null,
    };
  } catch (err) {
    console.error('[auth] Auth failed:', err instanceof Error ? err.message : String(err));
    return {
      user: null, userId: null, token: null, supabase: null,
      errorResponse: new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
}

export async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, serviceKey);
}

export { createAdminClient as createClient };

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, serviceKey);
}
