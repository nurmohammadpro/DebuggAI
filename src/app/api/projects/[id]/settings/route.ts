/**
 * Project Settings API Routes
 * Handles CRUD operations for project settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

async function verifyProjectOwnership(projectId: string, userId: string) {
  const supabase = createSupabaseAdmin();
  const { data: project, error } = await supabase
    .from('generations')
    .select('user_id')
    .eq('id', projectId)
    .single();

  if (error || !project) return false;
  return project.user_id === userId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id: projectId } = await params;

    const isOwner = await verifyProjectOwnership(projectId, auth.user!.id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = createSupabaseAdmin();
    const { data: settings, error } = await supabase
      .from('project_settings')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(settings || { project_id: projectId, settings: {} });
  } catch (error) {
    console.error('Error fetching project settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project settings' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id: projectId } = await params;

    const isOwner = await verifyProjectOwnership(projectId, auth.user!.id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const supabase = createSupabaseAdmin();

    const { data: settings, error } = await supabase
      .from('project_settings')
      .upsert({
        project_id: projectId,
        settings: body.settings || {},
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating project settings:', error);
    return NextResponse.json(
      { error: 'Failed to update project settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { id: projectId } = await params;

    const isOwner = await verifyProjectOwnership(projectId, auth.user!.id);
    if (!isOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const supabase = createSupabaseAdmin();

    const { data: existing } = await supabase
      .from('project_settings')
      .select('settings')
      .eq('project_id', projectId)
      .single();

    const currentSettings = existing?.settings || {};
    const mergedSettings = { ...currentSettings, ...(body.settings || {}) };

    const { data: settings, error } = await supabase
      .from('project_settings')
      .upsert({
        project_id: projectId,
        settings: mergedSettings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error patching project settings:', error);
    return NextResponse.json(
      { error: 'Failed to patch project settings' },
      { status: 500 }
    );
  }
}
