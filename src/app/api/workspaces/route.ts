/**
 * Workspaces API
 *
 * GET    /api/workspaces     - List user's workspaces
 * POST   /api/workspaces     - Create a new workspace
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace:workspaces(*)')
    .eq('user_id', auth.user!.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const workspaces = (data || []).map((m: any) => m.workspace).filter(Boolean);
  return NextResponse.json({ workspaces });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Create workspace
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .insert({
      name: body.name,
      description: body.description || null,
      owner_id: auth.user!.id,
      plan_type: body.plan_type || 'team',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add creator as owner member
  await supabase.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: auth.user!.id,
    role: 'owner',
  });

  return NextResponse.json({ workspace }, { status: 201 });
}
