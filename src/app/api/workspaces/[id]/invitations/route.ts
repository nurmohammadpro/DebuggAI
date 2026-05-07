/**
 * Workspace Invitations API
 *
 * GET    /api/workspaces/[id]/invitations  - List pending invitations
 * POST   /api/workspaces/[id]/invitations  - Create invitation
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
    .from('workspace_invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invitations: data || [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: workspaceId } = await params;
  const body = await req.json().catch(() => null);

  if (!body?.email || !body?.role) {
    return NextResponse.json({ error: 'email and role are required' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Look up user by email
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', body.email)
    .single();

  const { data: invitation, error } = await supabase
    .from('workspace_invitations')
    .insert({
      workspace_id: workspaceId,
      inviter_id: auth.user!.id,
      invitee_id: profile?.id || null,
      invitee_email: body.email,
      role: body.role,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ invitation }, { status: 201 });
}
