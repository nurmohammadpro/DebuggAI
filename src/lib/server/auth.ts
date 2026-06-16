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

    const email = authUser.email || '';

    // Look up the profile by Supabase Auth UUID first.
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, plan_type, is_admin')
      .eq('id', authUser.id)
      .maybeSingle();

    if (profile) {
      return {
        user: { id: profile.id, email: profile.email || '' },
        userId: profile.id,
        token,
        supabase,
        errorResponse: null,
      };
    }

    // Not found by UUID — the user may have signed up through Clerk
    // previously, which stored the Clerk ID (user_xxx) as the profile id.
    // Look up by email and migrate the profile id to the Supabase Auth UUID.
    if (email) {
      const { data: legacyProfile } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, plan_type, is_admin')
        .eq('email', email)
        .maybeSingle();

      if (legacyProfile) {
        // Migrate the profile id from the legacy Clerk ID to the Supabase
        // Auth UUID. Update all FK-referencing tables so existing data
        // (projects, credits, etc.) stays linked to this user.
        const oldId = legacyProfile.id;
        const newId = authUser.id;

        // These tables all reference profiles(id). Update them in parallel.
        const tables = ['projects', 'generations', 'credit_wallets',
          'credit_transactions', 'debug_sessions', 'web_builder_sessions',
          'threads', 'run_steps', 'runs', 'notifications', 'project_files',
        ] as const;

        await Promise.all([
          supabase.from('profiles').update({ id: newId }).eq('id', oldId),
          ...tables.map((t) =>
            supabase.from(t).update({ user_id: newId }).eq('user_id', oldId),
          ),
        ]);

        return {
          user: { id: newId, email: legacyProfile.email || email },
          userId: newId,
          token,
          supabase,
          errorResponse: null,
        };
      }
    }

    // First sign-in: create a fresh profile (the handle_new_user trigger
    // should have done this, but guard against a missing trigger).
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

    // Fallback: return the auth user even without a profile row.
    return {
      user: { id: authUser.id, email },
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
