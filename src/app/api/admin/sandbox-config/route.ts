/**
 * Admin Sandbox Config API
 *
 * GET:  Return sandbox configuration + live container count
 * POST: Toggle sandbox kill-switch (disable/enable sandbox creation)
 *
 * Requires admin authentication.
 */

import { NextResponse, type NextRequest } from 'next/server';

import { requireAdmin } from '@/lib/server/admin';
import { spawnSync } from 'child_process';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// In-memory kill-switch (also checked via env var SANDBOX_DISABLED).
// Environment variable takes precedence; this endpoint overrides the runtime flag.
let runtimeDisabled: boolean | null = null; // null = defer to env

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin.errorResponse) return admin.errorResponse;

  const envDisabled = process.env.SANDBOX_DISABLED === '1' || process.env.SANDBOX_DISABLED === 'true';
  const effectivelyDisabled = runtimeDisabled ?? envDisabled;

  // Count active containers (best-effort)
  let activeContainers = -1;
  try {
    const out = spawnSync('docker', [
      'ps', '--filter', 'name=debuggai-', '--format', '{{.Names}}',
    ], { encoding: 'utf-8', timeout: 5000 });
    if (!out.error && out.status === 0) {
      activeContainers = out.stdout.split('\n').filter(Boolean).length;
    }
  } catch {
    // docker not available — activeContainers stays -1
  }

  return NextResponse.json({
    enabled: !effectivelyDisabled,
    runtimeDisabled,
    envDisabled,
    activeContainers,
    maxSandboxes: parseInt(process.env.MAX_SANDBOXES || '10', 10),
    sandboxTimeoutMs: parseInt(process.env.SANDBOX_TIMEOUT_MS || '1800000', 10),
    dockerImage: process.env.SANDBOX_DOCKER_IMAGE || 'node:20-slim',
  });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin.errorResponse) return admin.errorResponse;

  try {
    const body = await request.json();
    const { disabled } = body as { disabled?: boolean };

    if (typeof disabled !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid "disabled" boolean field' },
        { status: 400 },
      );
    }

    runtimeDisabled = disabled;

    // Log the action
    console.log(
      `[admin] Sandbox kill-switch ${disabled ? 'DISABLED' : 'ENABLED'} by ${admin.user?.email}`,
    );

    return NextResponse.json({
      enabled: !runtimeDisabled,
      runtimeDisabled,
      envDisabled: process.env.SANDBOX_DISABLED === '1' || process.env.SANDBOX_DISABLED === 'true',
      note: runtimeDisabled
        ? 'Sandbox creation is disabled. Existing sandboxes continue running.'
        : 'Sandbox creation is enabled.',
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request' },
      { status: 400 },
    );
  }
}
