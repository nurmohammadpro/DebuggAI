/**
 * Newsletter Subscription API
 *
 * POST /api/newsletter - Subscribe to the newsletter
 */

import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { email } = body as { email?: string };

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    const { createSupabaseAdmin } = await import('@/lib/server/supabase-admin');
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .upsert(
        { email: email.trim().toLowerCase(), subscribed: true, subscribed_at: new Date().toISOString() },
        { onConflict: 'email' }
      )
      .select('id')
      .single();

    if (error) {
      console.error('Newsletter subscription error:', error);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error('Newsletter API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
