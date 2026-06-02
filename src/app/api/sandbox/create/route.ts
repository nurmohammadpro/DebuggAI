/**
 * POST /api/sandbox/create
 *
 * Creates a new sandbox: writes project files to disk and starts a Docker container.
 * Enforces credit charging and plan feature access for web builder.
 * Body: { files: Record<string, string> }
 * Returns: { id, port, status, previewUrl }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import { sandboxManager } from '@/lib/sandbox/sandbox';
import { requireFeature, getUserPlan, getActionCost, withRateLimit } from '@/lib/server/plan-enforcement';
import { spawnSync } from 'child_process';
import * as Sentry from '@sentry/nextjs';
import { getThrottleFlag } from '@/lib/server/throttle-config';
import { isEmailAdminAllowlisted } from '@/lib/admin/admin-allowlist';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { user, errorResponse, supabase } = await requireUser(req);
  if (!user) return errorResponse;

  try {
    // Prefer admin-controlled kill switch (throttle_config) so ops can disable previews without redeploy.
    const sandboxEnabled = await getThrottleFlag('sandbox_enabled', true);
    if (!sandboxEnabled) {
      return NextResponse.json(
        { error: 'Live preview is temporarily disabled.' },
        { status: 503 },
      );
    }

    if (process.env.SANDBOX_DISABLED === '1' || process.env.SANDBOX_DISABLED === 'true') {
      return NextResponse.json(
        { error: 'Live preview is temporarily disabled.' },
        { status: 503 },
      );
    }

    // Fail fast before charging credits if Docker isn't available.
    const dockerCheck = spawnSync('docker', ['version'], { encoding: 'utf-8' });
    const dockerStderr = `${dockerCheck.stderr || ''}`.trim();
    if (dockerCheck.error || (typeof dockerCheck.status === 'number' && dockerCheck.status !== 0)) {
      const permissionDenied =
        dockerStderr.toLowerCase().includes('permission denied') ||
        dockerStderr.toLowerCase().includes('got permission denied') ||
        dockerStderr.toLowerCase().includes('cannot connect to the docker daemon') ||
        dockerStderr.toLowerCase().includes('dial unix') ||
        dockerStderr.toLowerCase().includes('connect: permission denied');
      return NextResponse.json(
        {
          error:
            permissionDenied
              ? 'Docker CLI is installed, but this app container cannot reach the Docker socket. Make sure /var/run/docker.sock is mounted and the app container is in the socket’s docker group.'
              : 'Docker is required to run sandboxes. Install Docker Desktop and ensure the `docker` CLI is available, then restart the dev server.',
        },
        { status: 503 },
      );
    }

    const hasServiceRoleKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isDev = process.env.NODE_ENV !== 'production';
    const enforceBilling = !isDev && hasServiceRoleKey;
    const privilegedPreviewUser = isEmailAdminAllowlisted(user.email);

    // Enforce web_builder feature access based on plan.
    // If the service role key isn't configured, we can't reliably read plan state.
    // In that case (typically local dev), allow sandboxing without plan gating.
    if (enforceBilling && !privilegedPreviewUser) {
      const { allowed } = await requireFeature(user.id, 'web_builder');
      if (!allowed) {
        return NextResponse.json(
          { error: 'Web Builder requires a Pro plan or higher' },
          { status: 402 },
        );
      }
    }

    const body = await req.json();
    const { files, idempotencyKey } = body as { files?: Record<string, string>; idempotencyKey?: string };

    if (!files || Object.keys(files).length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 },
      );
    }

    // Determine cost based on file count
    const fileCount = Object.keys(files).length;
    const cost = fileCount > 20 ? getActionCost('web_builder_large')
      : fileCount > 10 ? getActionCost('web_builder_medium')
      : getActionCost('web_builder_small');

    if (!privilegedPreviewUser) {
      const rateLimit = await withRateLimit(user.id, 'web_builder', {
        req,
        creditsUsed: cost,
      });
      if (!rateLimit.allowed) {
        return NextResponse.json(rateLimit.body, {
          status: rateLimit.status,
          headers: { 'Retry-After': '60' },
        });
      }
    }

    // Charge credits atomically (production only, when admin key is configured).
    if (enforceBilling && !privilegedPreviewUser) {
      const adminClient = createSupabaseAdmin();
      const { error: spendError } = await adminClient.rpc('spend_credits', {
        p_user_id: user.id,
        p_amount: cost,
        p_source: 'sandbox_create',
        p_description: `Sandbox create (${fileCount} files)`,
        p_idempotency_key: idempotencyKey || null,
        p_metadata: { file_count: fileCount },
      });

      if (spendError) {
        const msg = spendError.message || 'Failed to spend credits';
        const status = msg.toLowerCase().includes('insufficient') ? 402 : 500;
        return NextResponse.json({ error: msg }, { status });
      }
    }

    const sandbox = await sandboxManager.create(user.id, files);

    return NextResponse.json({
      id: sandbox.id,
      port: sandbox.port,
      status: sandbox.status,
      previewUrl: `/preview/${sandbox.id}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create sandbox';
    console.error('[sandbox/create] Error:', { userId: user.id, error: message });
    Sentry.captureException(err, {
      tags: { route: 'sandbox/create' },
      extra: { userId: user.id, message },
    });
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
