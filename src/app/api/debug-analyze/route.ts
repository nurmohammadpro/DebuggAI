/**
 * Debug Analyze API Route
 *
 * Proxies requests to the Supabase debug-ai-analyze edge function.
 */

import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { withRateLimit } from '@/lib/server/plan-enforcement';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (auth.errorResponse) return auth.errorResponse;

    const rateLimit = await withRateLimit(auth.user!.id, 'analyze');
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify(rateLimit.body), {
        status: rateLimit.status,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const body = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/debug-ai-analyze`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${auth.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return new Response(
        JSON.stringify(errorData),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Return the response
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Debug analyze API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
