/**
 * Debug API Route (Proxy)
 *
 * Proxies to Supabase Edge Function `debug` which:
 * - meters credits
 * - creates runs/steps
 * - persists thread messages
 * - streams SSE output
 */

import type { NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { withRateLimit } from '@/lib/server/plan-enforcement';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const rateLimit = await withRateLimit(auth.user!.id, 'analyze', { req });
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify(rateLimit.body), {
      status: rateLimit.status,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
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

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/debug`;
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[api/debug] edge function error', {
      status: response.status,
      details: text.slice(0, 500),
    });
    Sentry.captureMessage('Debug edge function error', {
      level: 'error',
      tags: { route: 'debug', status: String(response.status) },
      extra: { details: text.slice(0, 500) },
    });
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });
  }

  return new Response(response.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
