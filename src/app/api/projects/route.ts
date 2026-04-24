import { NextResponse, type NextRequest } from 'next/server';

import { requireUser } from '@/lib/server/auth';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '20')));
  const search = (url.searchParams.get('search') || '').trim();

  let query = auth.supabase
    .from('generations')
    .select('id, description, stack, prompt, version, metadata, created_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`description.ilike.%${search}%,prompt.ilike.%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    projects: data || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.max(1, Math.ceil((count || 0) / limit)),
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const description =
    typeof body.description === 'string' ? body.description.trim() : null;
  const stack = typeof body.stack === 'string' ? body.stack : null;
  const prompt = typeof body.prompt === 'string' ? body.prompt : null;
  const code = typeof body.code === 'string' ? body.code : '';
  const metadata = body.metadata && typeof body.metadata === 'object' ? body.metadata : {};

  const { data, error } = await auth.supabase
    .from('generations')
    .insert({
      user_id: auth.user!.id,
      code,
      description,
      stack,
      prompt,
      metadata,
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

