/**
 * Deploy Edge Function
 *
 * Executes deployments to Vercel or Netlify via their REST APIs.
 * Reads integration credentials from project_integrations table.
 * Updates deployments table with status and logs audit events.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeployRequest {
  projectId: string;
  provider: 'vercel' | 'netlify';
  environment?: string;
  files?: Array<{ path: string; content: string }>;
  commitSha?: string;
  deploymentId?: string; // if updating an existing deployment record
}

interface VercelDeployment {
  id: string;
  url: string;
  readyState: string;
  created: number;
}

interface NetlifyDeploy {
  id: string;
  name: string;
  url: string;
  ssl_url: string;
  state: string;
  created_at: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: DeployRequest = await req.json();
    const { projectId, provider, environment = 'production', files, commitSha } = body;

    if (!projectId || !provider) {
      return new Response(JSON.stringify({ error: 'projectId and provider are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get integration credentials
    const { data: integrations, error: intErr } = await supabase
      .from('project_integrations')
      .select('config, access_token_encrypted')
      .eq('project_id', projectId)
      .eq('integration_type', provider)
      .eq('enabled', true)
      .limit(1);

    if (intErr || !integrations?.length) {
      return new Response(
        JSON.stringify({ error: `${provider} integration not configured for this project` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const integration = integrations[0];
    const token = integration.access_token_encrypted || integration.config?.accessToken;

    if (!token) {
      return new Response(
        JSON.stringify({ error: `No access token found for ${provider}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create or update deployment record
    const deployRecord = {
      project_id: projectId,
      user_id: user.id,
      provider,
      environment,
      status: 'building',
      commit_sha: commitSha || null,
      started_at: new Date().toISOString(),
    };

    const { data: deployment, error: depErr } = body.deploymentId
      ? await supabase.from('deployments').update({ status: 'building', started_at: deployRecord.started_at }).eq('id', body.deploymentId).select('id').single()
      : await supabase.from('deployments').insert(deployRecord).select('id').single();

    if (depErr) {
      return new Response(JSON.stringify({ error: depErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const deploymentId = deployment?.id || body.deploymentId;

    // Execute deploy
    let result: { url: string; status: string } | null = null;

    if (provider === 'vercel') {
      const projectIdOrName = integration.config?.projectId || integration.config?.projectName;
      const vercelUrl = projectIdOrName
        ? `https://api.vercel.com/v13/deployments`
        : `https://api.vercel.com/v13/deployments`;

      const vercelRes = await fetch(vercelUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectId,
          project: projectIdOrName,
          target: environment,
          files: files || [],
          source: 'cli',
        }),
      });

      if (!vercelRes.ok) {
        const err = await vercelRes.text();
        await supabase.from('deployments').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', deploymentId);
        return new Response(JSON.stringify({ error: `Vercel deploy failed: ${err}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const vercelData: VercelDeployment = await vercelRes.json();
      result = { url: `https://${vercelData.url}`, status: vercelData.readyState === 'READY' ? 'success' : 'building' };
    } else if (provider === 'netlify') {
      const siteId = integration.config?.siteId;
      if (!siteId) {
        await supabase.from('deployments').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', deploymentId);
        return new Response(JSON.stringify({ error: 'Netlify site ID not configured' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const netlifyRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: files?.reduce((acc, f) => ({ ...acc, [f.path]: f.content }), {}),
          draft: environment !== 'production',
        }),
      });

      if (!netlifyRes.ok) {
        const err = await netlifyRes.text();
        await supabase.from('deployments').update({ status: 'failed', completed_at: new Date().toISOString() }).eq('id', deploymentId);
        return new Response(JSON.stringify({ error: `Netlify deploy failed: ${err}` }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const netlifyData: NetlifyDeploy = await netlifyRes.json();
      result = { url: netlifyData.ssl_url || netlifyData.url, status: netlifyData.state === 'ready' ? 'success' : 'building' };
    }

    // Update deployment record
    if (result) {
      await supabase
        .from('deployments')
        .update({
          status: result.status,
          deployment_url: result.url,
          completed_at: result.status === 'success' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', deploymentId);
    }

    // Audit log
    await supabase.from('audit_events').insert({
      user_id: user.id,
      action: 'deploy.executed',
      details: { provider, environment, projectId, deploymentId, status: result?.status },
      target_type: 'deployment',
      target_id: deploymentId,
    });

    return new Response(JSON.stringify({ ok: true, deploymentId, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Deploy error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
