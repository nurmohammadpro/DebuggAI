/**
 * Project Branches API
 *
 * GET    /api/projects/[id]/branches  - List branches for a project
 * POST   /api/projects/[id]/branches  - Create a new branch
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

async function verifyProjectOwnership(projectId: string, userId: string) {
  const supabase = createSupabaseAdmin();
  const { data: project } = await supabase
    .from('generations')
    .select('user_id')
    .eq('id', projectId)
    .single();
  return project?.user_id === userId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: projectId } = await params;
  const isOwner = await verifyProjectOwnership(projectId, auth.user!.id);
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .rpc('get_project_branches', { p_project_id: projectId });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ branches: data || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: projectId } = await params;
  const isOwner = await verifyProjectOwnership(projectId, auth.user!.id);
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: 'Branch name is required' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('project_branches')
    .insert({
      project_id: projectId,
      name: body.name,
      description: body.description || null,
      created_by: auth.user!.id,
      created_from: body.from_version || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Branch name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ branch: data }, { status: 201 });
}
