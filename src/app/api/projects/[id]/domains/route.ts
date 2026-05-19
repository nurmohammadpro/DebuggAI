/**
 * Domains API Routes
 * Handles CRUD operations for custom domains
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

    const { data: domains, error } = await supabase
      .from('project_domains')
      .select('*')
      .eq('project_id', projectId)
      .order('primary_domain', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(domains || []);
  } catch (error) {
    console.error('Error fetching domains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
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

    // Generate verification token
    const verificationToken = Buffer.from(
      `${projectId}-${Date.now()}-${Math.random()}`
    ).toString('base64');

    const { data: domain, error } = await supabase
      .from('project_domains')
      .insert({
        project_id: projectId,
        domain: body.domain,
        primary_domain: body.primary_domain || false,
        verification_token: verificationToken,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'This domain is already registered' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(domain, { status: 201 });
  } catch (error) {
    console.error('Error creating domain:', error);
    return NextResponse.json(
      { error: 'Failed to create domain' },
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

    // If setting as primary, unset other primary domains
    if (body.primary_domain) {
      await supabase
        .from('project_domains')
        .update({ primary_domain: false })
        .eq('project_id', projectId)
        .neq('id', body.id);
    }

    const { data: domain, error } = await supabase
      .from('project_domains')
      .update({
        primary_domain: body.primary_domain,
        ssl_enabled: body.ssl_enabled,
      })
      .eq('id', body.id)
      .eq('project_id', projectId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(domain);
  } catch (error) {
    console.error('Error updating domain:', error);
    return NextResponse.json(
      { error: 'Failed to update domain' },
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
    const domainId = searchParams.get('id');

    if (!domainId) {
      return NextResponse.json(
        { error: 'Domain ID is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const { error } = await supabase
      .from('project_domains')
      .delete()
      .eq('id', domainId)
      .eq('project_id', projectId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting domain:', error);
    return NextResponse.json(
      { error: 'Failed to delete domain' },
      { status: 500 }
    );
  }
}

export async function POST_VERIFY(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const supabase = createSupabaseAdmin();

    // Verify domain ownership
    const { data: domain } = await supabase
      .from('project_domains')
      .select('*')
      .eq('id', body.id)
      .eq('project_id', projectId)
      .single();

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // In production, you would verify the domain DNS records here
    // For now, we'll mark it as verified
    const { data: updatedDomain, error } = await supabase
      .from('project_domains')
      .update({
        verified_at: new Date().toISOString(),
      })
      .eq('id', body.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(updatedDomain);
  } catch (error) {
    console.error('Error verifying domain:', error);
    return NextResponse.json(
      { error: 'Failed to verify domain' },
      { status: 500 }
    );
  }
}
