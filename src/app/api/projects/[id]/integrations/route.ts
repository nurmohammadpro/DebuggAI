/**
 * Integrations API Routes
 * Handles CRUD operations for third-party service integrations
 */

import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import { requireUser } from '@/lib/server/auth';
import { NextRequest, NextResponse } from 'next/server';

async function verifyProjectOwnership(userId: string, projectId: string): Promise<boolean> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();
  return !!data;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(req);
    if (auth.errorResponse) return auth.errorResponse;
    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(auth.user!.id, projectId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const supabase = createSupabaseAdmin();

    const { data: integrations, error } = await supabase
      .from('project_integrations')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(integrations || []);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch integrations' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(req);
    if (auth.errorResponse) return auth.errorResponse;
    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(auth.user!.id, projectId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const body = await req.json();
    const supabase = createSupabaseAdmin();

    const { data: integration, error } = await supabase
      .from('project_integrations')
      .insert({
        project_id: projectId,
        integration_type: body.integration_type,
        config: body.config || {},
        enabled: body.enabled ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Integration of this type already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    console.error('Error creating integration:', error);
    return NextResponse.json(
      { error: 'Failed to create integration' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(req);
    if (auth.errorResponse) return auth.errorResponse;
    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(auth.user!.id, projectId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const body = await req.json();
    const supabase = createSupabaseAdmin();

    const { data: integration, error } = await supabase
      .from('project_integrations')
      .update({
        config: body.config,
        enabled: body.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(integration);
  } catch (error) {
    console.error('Error updating integration:', error);
    return NextResponse.json(
      { error: 'Failed to update integration' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireUser(req);
    if (auth.errorResponse) return auth.errorResponse;
    const { id: projectId } = await params;
    if (!(await verifyProjectOwnership(auth.user!.id, projectId))) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    const { searchParams } = new URL(req.url);
    const integrationId = searchParams.get('id');

    if (!integrationId) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('project_integrations')
      .delete()
      .eq('id', integrationId)
      .eq('project_id', projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
