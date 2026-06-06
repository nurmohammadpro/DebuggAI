/**
 * Git Integration API
 *
 * GET    /api/projects/[id]/git  - Get git integration status
 * POST   /api/projects/[id]/git  - Connect git provider
 * DELETE /api/projects/[id]/git  - Disconnect git provider
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
    .from('git_integrations')
    .select('*')
    .eq('project_id', projectId)
    .single();

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ integration: data || null });
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
  if (!body?.provider || !body?.repository_url) {
    return NextResponse.json(
      { error: 'provider and repository_url are required' },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('git_integrations')
    .upsert({
      project_id: projectId,
      provider: body.provider,
      repository_url: body.repository_url,
      branch: body.branch || 'main',
      access_token_encrypted: body.access_token || null,
      sync_enabled: true,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ integration: data });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: projectId } = await params;
  const isOwner = await verifyProjectOwnership(projectId, auth.user!.id);
  if (!isOwner) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('git_integrations')
    .delete()
    .eq('project_id', projectId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
