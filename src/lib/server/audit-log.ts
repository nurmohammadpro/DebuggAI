import 'server-only';

import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

type AuditAction =
  | 'run.created'
  | 'run.executed'
  | 'run.canceled'
  | 'run.succeeded'
  | 'run.failed'
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
) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from('audit_events').insert({
      user_id: userId,
      action,
      details: JSON.stringify(details),
      target_type: targetType || null,
      target_id: targetId || null,
      ip_address: null,
    });
  } catch {
    // Audit logging is best-effort — never fail the main operation
  }
}
