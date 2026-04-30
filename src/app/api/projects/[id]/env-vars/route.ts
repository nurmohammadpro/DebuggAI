/**
 * Environment Variables API Routes
 * Handles CRUD operations for project environment variables
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

    const { data: envVars, error } = await supabase
      .from('project_env_vars')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Mask secret values in response
    const maskedVars = envVars?.map(envVar => ({
      ...envVar,
      value: envVar.is_secret ? '********' : envVar.value,
    })) || [];

    return NextResponse.json(maskedVars);
  } catch (error) {
    console.error('Error fetching environment variables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch environment variables' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const supabase = createSupabaseAdmin();

    const { data: envVar, error } = await supabase
      .from('project_env_vars')
      .insert({
        project_id: projectId,
        key: body.key,
        value: body.value,
        is_secret: body.is_secret ?? true,
        description: body.description,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Environment variable with this key already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(envVar, { status: 201 });
  } catch (error) {
    console.error('Error creating environment variable:', error);
    return NextResponse.json(
      { error: 'Failed to create environment variable' },
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

    const { data: envVar, error } = await supabase
      .from('project_env_vars')
      .update({
        value: body.value,
        is_secret: body.is_secret,
        description: body.description,
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(envVar);
  } catch (error) {
    console.error('Error updating environment variable:', error);
    return NextResponse.json(
      { error: 'Failed to update environment variable' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { searchParams } = new URL(req.url);
    const envVarId = searchParams.get('id');

    if (!envVarId) {
      return NextResponse.json(
        { error: 'Environment variable ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('project_env_vars')
      .delete()
      .eq('id', envVarId)
      .eq('project_id', projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting environment variable:', error);
    return NextResponse.json(
      { error: 'Failed to delete environment variable' },
      { status: 500 }
    );
  }
}
