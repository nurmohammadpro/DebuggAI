import 'server-only';
import type { NextRequest } from 'next/server';

/**
 * Server-side auth — Clerk-only.
 *
 *   Bearer token (Clerk JWT from Authorization header)
 *         │
 *         ▼
 *   Verify via CLERK_SECRET_KEY
 *         │
 *         ▼
 *   Look up profiles table (by clerk_id or email)
 *         │
 *         ▼
 *   Return auth.user.id = Supabase user UUID
 *
 * All API routes downstream use auth.user.id unchanged.
 */
export async function requireUser(req: NextRequest) {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = header?.match(/^Bearer\s+(.+)$/i)?.[1] || null;

  if (!token) {
    return {
      user: null, userId: null, token: null, supabase: null,
      errorResponse: new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey || clerkSecretKey.length < 10) {
    return {
      user: null, userId: null, token: null, supabase: null,
      errorResponse: new Response(JSON.stringify({ error: 'CLERK_SECRET_KEY not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      }),
    };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
  const { createClient } = await import('@supabase/supabase-js');
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    const { createClerkClient } = await import('@clerk/backend');
    const clerkUser = await createClerkClient({ secretKey: clerkSecretKey }).users.getUser(token);

    if (!clerkUser?.id) throw new Error('Invalid Clerk user');

    const clerkUserId = clerkUser.id;
    const clerkEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
    let supabaseUserId = clerkUserId;

    // Resolve or create Supabase user mapping
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id')
      .or(`clerk_id.eq.${clerkUserId},email.eq.${clerkEmail}`)
      .limit(1)
      .maybeSingle();

    if (profile?.id) {
      supabaseUserId = profile.id;
      await (adminClient.from('profiles').update({ clerk_id: clerkUserId }).eq('id', profile.id) as unknown as Promise<any>).catch(() => {});
    } else if (clerkEmail) {
      const name = clerkUser.firstName || clerkUser.username || 'Developer';
      await (adminClient.from('profiles').insert({
        id: clerkUserId, clerk_id: clerkUserId,
        email: clerkEmail, full_name: name,
        plan_type: 'free', is_admin: false,
      }) as unknown as Promise<any>).catch(() => {});
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    return {
      user: { id: supabaseUserId, email: clerkEmail || '' },
      userId: supabaseUserId,
      token,
      supabase,
      errorResponse: null,
    };
  } catch (err) {
    console.error('[auth] Clerk auth failed:', err instanceof Error ? err.message : String(err));
    return {
      user: null, userId: null, token: null, supabase: null,
      errorResponse: new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      }),
    };
  }
}
/**
 * Creates a Supabase admin client using the service role key.
 * Used by admin authentication routes.
 */
export async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(supabaseUrl, serviceKey);
}
