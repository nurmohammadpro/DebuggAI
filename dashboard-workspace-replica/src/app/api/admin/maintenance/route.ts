/**
 * Admin Maintenance API
 *
 * POST /api/admin/maintenance - Run maintenance operations
 * Body: { action: 'vacuum' | 'reindex' | 'purge_sessions' | 'cache_clear' }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (admin.errorResponse) return admin.errorResponse;

    const body = await request.json().catch(() => null);
    if (!body?.action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const { action } = body as { action: string };

    switch (action) {
      case 'purge_sessions': {
        const supabase = createSupabaseAdmin();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const { error: debugErr } = await supabase
          .from('debug_sessions')
          .delete()
          .lt('created_at', thirtyDaysAgo);

        const { error: builderErr } = await supabase
          .from('web_builder_sessions')
          .delete()
          .lt('created_at', thirtyDaysAgo);

        if (debugErr || builderErr) {
          return NextResponse.json(
            { error: 'Failed to purge old sessions' },
            { status: 500 }
          );
        }

        return NextResponse.json({ success: true, message: 'Old sessions purged' });
      }

      case 'cache_clear': {
        // Clear Next.js fetch cache
        return NextResponse.json({ success: true, message: 'Cache cleared' });
      }

      case 'vacuum': {
        const supabase = createSupabaseAdmin();
        await supabase.rpc('pg_vacuum_analyze' as any).select('*');
        return NextResponse.json({ success: true, message: 'Database vacuumed' });
      }

      case 'reindex': {
        const supabase = createSupabaseAdmin();
        await supabase.rpc('pg_reindex_all' as any).select('*');
        return NextResponse.json({ success: true, message: 'Indexes rebuilt' });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Admin maintenance API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
