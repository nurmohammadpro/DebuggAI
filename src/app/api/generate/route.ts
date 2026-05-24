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
import { requireUser } from '@/lib/server/auth';
import { withRateLimit } from '@/lib/server/plan-enforcement';
import * as Sentry from '@sentry/nextjs';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const rateLimit = await withRateLimit(auth.user!.id, 'web_builder');
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

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate`;
  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const contentType = response.headers.get('Content-Type') || '';
    const text = await response.text().catch(() => '');

    // Ensure the client always receives JSON, even if the edge platform returns HTML/text.
    let json: { error?: string; details?: string } | null = null;
    if (contentType.includes('application/json')) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    const details = text && text.length > 2000 ? text.slice(0, 2000) + '…' : text;
    const payload =
      json && (json.error || json.details)
        ? json
        : {
            error: 'Generate request failed',
            // Only surface raw details in non-production to avoid leaking platform internals.
            details: process.env.NODE_ENV === 'production' ? undefined : details || undefined,
          };

    // Server-side log for local debugging.
    console.error('[api/generate] edge function error', {
      status: response.status,
      contentType,
      details: details?.slice(0, 500),
    });
    Sentry.captureMessage('Generate edge function error', {
      level: 'error',
      tags: { route: 'generate', status: String(response.status) },
      extra: { contentType, details: details?.slice(0, 500) },
    });

    return new Response(JSON.stringify(payload), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
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
