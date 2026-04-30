/**
 * Project Settings API Routes
 * Handles CRUD operations for project settings
 */

import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
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
  try {
    const { id: projectId } = await params;
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
  try {
    const { id: projectId } = await params;
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
