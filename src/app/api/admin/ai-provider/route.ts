import { NextResponse, type NextRequest } from 'next/server';

import { requireAdmin } from '@/lib/server/admin';
import {
  getAiProviderConfigPublic,
  upsertAiProviderConfig,
} from '@/lib/server/ai-provider-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin.errorResponse) return admin.errorResponse;

  const config = await getAiProviderConfigPublic();
  if (!config) {
    return NextResponse.json({ error: 'AI provider config not found' }, { status: 404 });
  }

  return NextResponse.json({ config });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (admin.errorResponse) return admin.errorResponse;

  const body = await req.json().catch(() => null) as null | {
    enabled?: boolean;
    baseUrl?: string;
    model?: string;
    apiKey?: string | null;
  };

  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const enabled = body.enabled !== false;
  const baseUrl = typeof body.baseUrl === 'string' ? body.baseUrl : '';
  const model = typeof body.model === 'string' ? body.model : '';
  const apiKey = body.apiKey === undefined ? undefined : body.apiKey;

  try {
    await upsertAiProviderConfig({ enabled, baseUrl, model, apiKey });
    const config = await getAiProviderConfigPublic();
    return NextResponse.json({ ok: true, config });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to update config';
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

