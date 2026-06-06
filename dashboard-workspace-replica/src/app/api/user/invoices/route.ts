/**
 * User Invoice History API
 *
 * Returns the authenticated user's Stripe invoice history via the Stripe REST API.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const supabase = createSupabaseAdmin();
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', auth.user!.id)
      .single();

    if (profileErr || !profile?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ invoices: [] });
    }

    const url = new URL(req.url);
    const limit = Math.min(25, Math.max(1, Number(url.searchParams.get('limit') || 10)));

    const stripeUrl = new URL('https://api.stripe.com/v1/invoices');
    stripeUrl.searchParams.set('customer', profile.stripe_customer_id);
    stripeUrl.searchParams.set('limit', String(limit));
    stripeUrl.searchParams.set('status', 'paid');

    const res = await fetch(stripeUrl.toString(), {
      headers: { Authorization: `Bearer ${stripeKey}` },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Stripe invoices error:', err);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 502 });
    }

    const data = await res.json();
    const invoices = (data.data || []).map((inv: any) => ({
      id: inv.id,
      number: inv.number,
      amount: (inv.amount_paid || 0) / 100,
      currency: inv.currency,
      status: inv.status,
      pdfUrl: inv.invoice_pdf,
      hostedUrl: inv.hosted_invoice_url,
      created: new Date(inv.created * 1000).toISOString(),
      periodStart: new Date(inv.period_start * 1000).toISOString(),
      periodEnd: new Date(inv.period_end * 1000).toISOString(),
    }));

    return NextResponse.json({ invoices });
  } catch (err: any) {
    console.error('Failed to fetch invoices:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch invoices' }, { status: 500 });
  }
}
