import 'server-only';

import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import type { NextRequest } from 'next/server';

type AuditAction =
  | 'run.created'
  | 'run.executed'
  | 'run.canceled'
  | 'run.succeeded'
  | 'run.failed'
  | 'rate_limit.hit'
  | 'credit.spent'
  | 'credit.added'
  | 'credit.adjusted'
  | 'plan.changed'
  | 'user.banned'
  | 'user.unbanned'
  | 'admin.action'
  | 'integration.connected'
  | 'deploy.triggered'
  | 'sandbox.created'
  | 'sandbox.stopped';

export async function logAuditEvent(
  userId: string,
  action: AuditAction,
  details: Record<string, unknown> = {},
  targetType?: string,
  targetId?: string,
  opts?: { req?: NextRequest },
) {
  try {
    const supabase = createSupabaseAdmin();
    const forwarded =
      opts?.req?.headers.get('x-forwarded-for') ||
      opts?.req?.headers.get('X-Forwarded-For');
    const ip = forwarded ? forwarded.split(',')[0]?.trim() : null;
    await supabase.from('audit_events').insert({
      user_id: userId,
      action,
      details: JSON.stringify(details),
      target_type: targetType || null,
      target_id: targetId || null,
      ip_address: ip || null,
    });
  } catch {
    // Audit logging is best-effort — never fail the main operation
  }
}
