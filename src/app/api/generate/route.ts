/**
 * Generate API Route (Proxy)
 *
 * Proxies to Supabase Edge Function `generate` which:
 * - meters credits
 * - creates runs/steps
 * - persists thread messages
 * - streams SSE output
 */

import type { NextRequest } from 'next/server';
import { getBearerToken } from '@/lib/api/bearer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return new Response(JSON.stringify({ error: 'Supabase URL not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate`;
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });
  }

  // Stream-through SSE.
  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

