/**
 * Template Generation API Route
 *
 * Proxies to Supabase Edge Function `web-builder-templates` which
 * generates complete project structures instantly from static templates
 * (no LLM call). Handles auth, rate limiting, and credit spending.
 */

import type { NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { withRateLimit, getActionCost } from '@/lib/server/plan-enforcement';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const user = auth.user!;
  const supabase = auth.supabase!;

  const rateLimit = await withRateLimit(user.id, 'generate');
  if (!rateLimit.allowed) {
    return new Response(JSON.stringify(rateLimit.body), {
      status: rateLimit.status,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.stack || !body.projectName) {
    return new Response(
      JSON.stringify({ error: 'Stack and projectName are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { stack, features, projectName } = body as {
    stack: string;
    features: string[];
    projectName: string;
  };

  // Spend credits using tiered pricing based on feature count
  const cost = getActionCost('web_builder_small');
  const { data: creditData, error: creditError } = await supabase.rpc(
    'spend_credits',
    {
      p_user_id: user.id,
      p_amount: cost,
      p_source: 'web_builder_template',
      p_description: `${stack} template: ${projectName}`,
      p_idempotency_key: `template_${user.id}_${Date.now()}`,
    }
  );

  if (creditError) {
    return new Response(
      JSON.stringify({ error: 'Credit spending failed', details: creditError }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const creditResult = creditData as Array<{ wallet_id: string; new_balance: number; tx_id: string }> | null;
  if (!creditResult || creditResult.length === 0) {
    return new Response(
      JSON.stringify({ error: 'Insufficient credits' }),
      { status: 402, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Proxy to the template edge function
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    return new Response(
      JSON.stringify({ error: 'Supabase URL not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const edgeFnUrl = `${supabaseUrl}/functions/v1/web-builder-templates`;
  const response = await fetch(edgeFnUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ stack, features: features || [], projectName }),
  });

  if (!response.ok) {
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await response.json();

  return new Response(
    JSON.stringify({
      ...data,
      credits: {
        spent: cost,
        remaining: creditResult[0]?.new_balance,
      },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
