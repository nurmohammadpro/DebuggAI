/**
 * Contact Form API
 *
 * POST /api/contact - Submit a contact form message
 */

import { NextResponse, type NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { name, email, subject, message } = body as {
      name?: string;
      email?: string;
      subject?: string;
      message?: string;
    };

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const { createSupabaseAdmin } = await import('@/lib/server/supabase-admin');
    const supabase = createSupabaseAdmin();

    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: (subject || '').trim() || null,
        message: message.trim(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('Contact form insert error:', error);
      return NextResponse.json({ error: 'Failed to submit message' }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (error) {
    console.error('Contact form API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
