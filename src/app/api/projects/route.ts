import { NextResponse, type NextRequest } from 'next/server';

import { requireUser } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '20')));
  const search = (url.searchParams.get('search') || '').trim();

  // Canonical projects list (backwards compatible: legacy projects use the same UUID as the first generation).
  let query = auth.supabase
    .from('projects')
    .select('id, name, description, stack, status, created_at, updated_at', {
      count: 'exact',
    })
    .eq('user_id', auth.user!.id)
    .order('updated_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
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

  // To preserve existing `?project=<uuid>` behavior, we create a project whose id equals
  // the first generation id. New versions will reference generations.project_id.
  const projectId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

  const { error: projectError } = await auth.supabase
    .from('projects')
    .insert({
      id: projectId,
      user_id: auth.user!.id,
      name: description || 'Untitled Project',
      description: prompt || description,
      stack,
      status: 'active',
    });

  if (projectError) return NextResponse.json({ error: projectError.message }, { status: 500 });

  const { error: genError } = await auth.supabase
    .from('generations')
    .insert({
      id: projectId,
      user_id: auth.user!.id,
      project_id: projectId,
      code,
      description,
      stack,
      prompt,
      metadata,
      version: 1,
    });

  if (genError) return NextResponse.json({ error: genError.message }, { status: 500 });

  return NextResponse.json({ id: projectId }, { status: 201 });
}
