/**
 * Deploy API Route
 *
 * Triggers a deployment of the project to Vercel or Netlify.
 * Body: { provider: 'vercel' | 'netlify', files: Record<string, string>, env?: Record<string, string> }
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import { logAuditEvent } from '@/lib/server/audit-log';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: projectId } = await ctx.params;
  const body = await req.json().catch(() => null) as null | {
    provider: string;
    files?: Record<string, string>;
    env?: Record<string, string>;
  };

  if (!body?.provider) {
    return NextResponse.json({ error: 'provider is required (vercel | netlify)' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  // Look up integration tokens
  const { data: integration } = await supabase
    .from('project_integrations')
    .select('config, access_token_encrypted')
    .eq('project_id', projectId)
    .eq('provider', body.provider)
    .single();

  if (!integration) {
    return NextResponse.json({ error: `No ${body.provider} integration configured for this project` }, { status: 400 });
  }

  const token = integration.access_token_encrypted || integration.config?.accessToken;
  if (!token) {
    return NextResponse.json({ error: `No access token found for ${body.provider}` }, { status: 400 });
  }

  const config = integration.config || {};
  const siteId = config.siteId || config.projectId;

  try {
    let deployResult: { url?: string; id?: string; status?: string } = {};

    if (body.provider === 'vercel') {
      const files = body.files || {};
      const fileArray = Object.entries(files).map(([file, data]) => ({ file, data }));

      const vercelRes = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `debuggai-${projectId}`,
          files: fileArray,
          projectSettings: {
            framework: 'nextjs',
            ...(body.env ? { environmentVariables: Object.entries(body.env).map(([k, v]) => ({ key: k, value: v, target: ['production'] })) } : {}),
          },
        }),
      });

      if (!vercelRes.ok) {
        const err = await vercelRes.text();
        return NextResponse.json({ error: `Vercel deploy failed: ${err}` }, { status: 502 });
      }

      const vercelData = await vercelRes.json();
      deployResult = { url: `https://${vercelData.url}`, id: vercelData.id, status: vercelData.readyState };
    } else if (body.provider === 'netlify') {
      if (!siteId) {
        return NextResponse.json({ error: 'Netlify site ID is required' }, { status: 400 });
      }

      // Create a zip from files using the sandbox manager
      const files = body.files || {};
      const fileEntries = Object.entries(files).map(([path, content]) => ({ path, content }));

      const netlifyRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: fileEntries.reduce((acc: Record<string, unknown>, f) => {
            acc[f.path] = f.content;
            return acc;
          }, {}),
          draft: false,
        }),
      });

      if (!netlifyRes.ok) {
        const err = await netlifyRes.text();
        return NextResponse.json({ error: `Netlify deploy failed: ${err}` }, { status: 502 });
      }

      const netlifyData = await netlifyRes.json();
      deployResult = { url: netlifyData.deploy_ssl_url || netlifyData.deploy_url, id: netlifyData.id, status: netlifyData.state };
    } else {
      return NextResponse.json({ error: `Unknown provider: ${body.provider}` }, { status: 400 });
    }

    // Log deployment
    await supabase.from('deployments').insert({
      project_id: projectId,
      user_id: auth.user!.id,
      provider: body.provider,
      status: deployResult.status || 'building',
      url: deployResult.url || '',
      metadata: { provider_deploy_id: deployResult.id },
    });

    await logAuditEvent(auth.user!.id, 'deploy.triggered', { provider: body.provider, projectId }, 'project', projectId);

    return NextResponse.json({ ok: true, ...deployResult });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Deploy failed' }, { status: 500 });
  }
}
