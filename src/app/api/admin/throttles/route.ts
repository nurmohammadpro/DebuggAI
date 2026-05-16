/**
 * Admin Throttle Config CRUD API
 *
 * Persist rate limit rules, AI model config, and security toggles
 * to a throttle_config table. Admin-only access.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/server/admin';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

const TABLE = 'throttle_config';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin.errorResponse) return admin.errorResponse;

  const supabase = createSupabaseAdmin();
  const url = new URL(req.url);
  const category = url.searchParams.get('category');

  let query = supabase.from(TABLE).select('*').order('key', { ascending: true });
  if (category) query = query.eq('category', category);

  const { data, error } = await query;

  if (error) {
    // Table may not exist yet — return empty
    if (error.code === '42P01') {
      return NextResponse.json({ configs: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ configs: data || [] });
}

// Upsert config values
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin.errorResponse) return admin.errorResponse;

  const supabase = createSupabaseAdmin();
  const body = await req.json();

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Body must be a JSON object of key-value pairs' }, { status: 400 });
  }

  const entries = Object.entries(body).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
    updated_at: new Date().toISOString(),
  }));

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No config entries provided' }, { status: 400 });
  }

  const results: Array<{ key: string; ok: boolean; error?: string }> = [];

  for (const entry of entries) {
    try {
      const { error } = await supabase
        .from(TABLE)
        .upsert(entry, { onConflict: 'key' });

      results.push({
        key: entry.key as string,
        ok: !error,
        error: error?.message,
      });
    } catch (e) {
      results.push({
        key: entry.key as string,
        ok: false,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ results });
}

// Delete a config key
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin.errorResponse) return admin.errorResponse;

  const supabase = createSupabaseAdmin();
  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  if (!key) {
    return NextResponse.json({ error: 'key query parameter is required' }, { status: 400 });
  }

  const { error } = await supabase.from(TABLE).delete().eq('key', key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: key });
}
