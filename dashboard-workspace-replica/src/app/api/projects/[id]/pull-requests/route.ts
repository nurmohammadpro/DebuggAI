/**
 * Pull Requests API
 *
 * GET    /api/projects/[id]/pull-requests  - List PRs for a project
 * POST   /api/projects/[id]/pull-requests  - Create a new pull request
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
    .from('pull_requests')
    .select('*, from_branch:project_branches!from_branch_id(name), to_branch:project_branches!to_branch_id(name)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pull_requests: data || [] });
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
  if (!body?.from_branch_id || !body?.to_branch_id || !body?.title) {
    return NextResponse.json(
      { error: 'from_branch_id, to_branch_id, and title are required' },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('pull_requests')
    .insert({
      project_id: projectId,
      from_branch_id: body.from_branch_id,
      to_branch_id: body.to_branch_id,
      title: body.title,
      description: body.description || null,
      created_by: auth.user!.id,
      status: 'open',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pull_request: data }, { status: 201 });
}
