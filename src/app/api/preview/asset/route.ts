/**
 * GET /api/preview/asset
 *
 * Serves static assets (images, fonts) from project_files so the
 * preview iframe can reference them. Assets are stored as base64.
 *
 * Example: /api/preview/asset?projectId=abc&path=public/hero.png
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
  ico: 'image/x-icon', woff: 'font/woff', woff2: 'font/woff2',
  ttf: 'font/ttf', otf: 'font/otf',
};

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const filePath = url.searchParams.get('path');

  if (!projectId || !filePath) {
    return NextResponse.json({ error: 'projectId and path are required' }, { status: 400 });
  }

  if (filePath.includes('..') || filePath.startsWith('/')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.SUPABASE_ANON_KEY!;
    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: row } = await admin
      .from('project_files')
      .select('content')
      .eq('project_id', projectId)
      .eq('path', filePath)
      .maybeSingle();

    if (!row?.content) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const ext = filePath.split('.').pop()?.toLowerCase() || '';
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (contentType.startsWith('image/') || contentType.startsWith('font/')) {
      const buffer = Buffer.from(row.content, 'base64');
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600',
          'Content-Length': String(buffer.length),
        },
      });
    }

    return new NextResponse(row.content, {
      headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=3600' },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}
