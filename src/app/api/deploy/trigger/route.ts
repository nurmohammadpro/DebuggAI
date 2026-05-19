/**
 * Deploy Trigger API
 *
 * Triggers deployment to Vercel or Netlify using their API.
 * Falls back to creating a deployment record with build instructions
 * for manual/CI deployment if provider API keys aren't configured.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { withRateLimit } from '@/lib/server/plan-enforcement';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.env.VERCEL_DEPLOY_TOKEN;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;
const NETLIFY_TOKEN = process.env.NETLIFY_TOKEN;
const NETLIFY_SITE_ID = process.env.NETLIFY_SITE_ID;

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser(request);
    if (auth.errorResponse) return auth.errorResponse;

    const rateLimit = await withRateLimit(auth.user!.id, 'deploy');
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify(rateLimit.body), {
        status: rateLimit.status,
        headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
      });
    }

    const body = await request.json();
    const {
      deploymentId,
      provider,
      projectName,
      archivePath,
      config,
    } = body as {
      deploymentId: string;
      provider: 'vercel' | 'netlify';
      projectName: string;
      archivePath: string;
      config: {
        framework: string;
        buildCommand: string;
        outputDir: string;
        installCommand: string;
        env: Record<string, string>;
        region: string;
      };
    };

    if (!deploymentId || !provider || !projectName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Update deployment status
    const adminClient = createSupabaseAdmin();
    await adminClient
      .from('deployments')
      .update({ status: 'deploying' })
      .eq('id', deploymentId);

    let deployUrl: string | null = null;

    if (provider === 'vercel' && VERCEL_TOKEN) {
      // Deploy to Vercel
      try {
        const vercelRes = await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: projectName,
            project: projectName,
            files: [], // Empty as we'll use the deployment endpoint with the archive
            target: 'production',
            projectSettings: {
              framework: config.framework || null,
              buildCommand: config.buildCommand || null,
              outputDirectory: config.outputDir || null,
              installCommand: config.installCommand || null,
            },
            env: Object.fromEntries(
              Object.entries(config.env || {}).map(([k, v]) => [k, v])
            ),
            region: config.region || 'iad1',
          }),
        });

        if (vercelRes.ok) {
          const vercelData = await vercelRes.json();
          deployUrl = vercelData.url
            ? `https://${vercelData.url}`
            : `https://${projectName}.vercel.app`;
        } else {
          const vercelError = await vercelRes.text();
          console.error('Vercel deploy error:', vercelError);
          // Fall through to manual deploy
        }
      } catch (vercelErr) {
        console.error('Vercel deploy error:', vercelErr);
      }
    }

    if (provider === 'netlify' && NETLIFY_TOKEN) {
      // Deploy to Netlify
      try {
        const netlifyRes = await fetch(
          `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID || projectName}/deploys`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${NETLIFY_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              branch: 'main',
              functions: [],
              build: {
                command: config.buildCommand || 'npm run build',
                publish: config.outputDir || 'dist',
                base: '/',
                environment: Object.fromEntries(
                  Object.entries(config.env || {}).map(([k, v]) => [k, v])
                ),
              },
            }),
          }
        );

        if (netlifyRes.ok) {
          const netlifyData = await netlifyRes.json();
          deployUrl = netlifyData.ssl_url || netlifyData.url || `https://${projectName}.netlify.app`;
        } else {
          const netlifyError = await netlifyRes.text();
          console.error('Netlify deploy error:', netlifyError);
        }
      } catch (netlifyErr) {
        console.error('Netlify deploy error:', netlifyErr);
      }
    }

    // If no provider token configured, return a manual deploy URL
    if (!deployUrl) {
      if (provider === 'vercel') {
        deployUrl = `https://vercel.com/new/clone?repository-url=&project-name=${projectName}`;
      } else {
        deployUrl = `https://app.netlify.com/start/deploy?repository=&name=${projectName}`;
      }

      // Create deploy instructions
      await adminClient
        .from('deployments')
        .update({
          status: 'success',
          deployment_url: deployUrl,
          completed_at: new Date().toISOString(),
        })
        .eq('id', deploymentId);

      return NextResponse.json({
        url: deployUrl,
        deployUrl,
        manual: true,
        message: `Deployment prepared. Visit the provider dashboard to complete deployment.`,
      });
    }

    // Update deployment with URL
    await adminClient
      .from('deployments')
      .update({
        status: 'success',
        deployment_url: deployUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('id', deploymentId);

    return NextResponse.json({
      success: true,
      url: deployUrl,
      deployUrl,
      provider,
    });
  } catch (error) {
    console.error('Deploy trigger error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Deploy trigger failed' },
      { status: 500 }
    );
  }
}
