/**
 * Workspace Members API
 *
 * GET    /api/workspaces/[id]/members  - List workspace members
 * POST   /api/workspaces/[id]/members  - Add a member (by invitation)
 * DELETE /api/workspaces/[id]/members  - Remove a member
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: workspaceId } = await params;
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('workspace_members')
    .select('*, profile:profiles(id, email, display_name, avatar_url)')
    .eq('workspace_id', workspaceId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ members: data || [] });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: workspaceId } = await params;
  const body = await req.json().catch(() => null);
  const userId = body?.user_id;

  if (!userId) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
