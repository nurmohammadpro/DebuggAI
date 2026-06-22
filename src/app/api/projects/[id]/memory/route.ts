/**
 * GET/PUT /api/projects/[id]/memory
 *
 * Read and update the project_memory.md file persisted in project_files.
 * The agent uses this file to maintain context across turns.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const admin = createSupabaseAdmin();

  const { data, error } = await admin
    .from('project_files')
    .select('content, updated_at')
    .eq('project_id', projectId)
    .eq('path', 'project_memory.md')
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Failed to load project memory' }, { status: 500 });
  }

  return NextResponse.json({
    content: data?.content ?? '',
    updatedAt: data?.updated_at ?? null,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: projectId } = await params;
  const admin = createSupabaseAdmin();

  const { content } = (await req.json()) as { content?: string };
  if (typeof content !== 'string') {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const { error } = await admin
    .from('project_files')
    .upsert({
      project_id: projectId,
      path: 'project_memory.md',
      content,
      status: 'modified',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'project_id,path' });

  if (error) {
    return NextResponse.json({ error: 'Failed to save project memory' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
