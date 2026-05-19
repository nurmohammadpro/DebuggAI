/**
 * Create Checkout API Route
 *
 * Proxies requests to the Supabase create-checkout edge function.
 */

import { NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireUser(req);
    if (auth.errorResponse) return auth.errorResponse;

    // 2. Get request body
    const body = await req.json();

    // 3. Call Supabase edge function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/create-checkout`;

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
    console.error('Create checkout API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
