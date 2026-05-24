import 'server-only';

import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import { PLANS, CREDIT_COSTS } from '@/lib/constants';
import type { NextRequest } from 'next/server';
import { logAuditEvent } from '@/lib/server/audit-log';

type PlanType = keyof typeof PLANS;
type FeatureName = 'analyze' | 'reverse' | 'web_builder' | 'zero_knowledge' | 'priority_ai'
  | 'team_dashboard' | 'export' | 'github' | 'vercel' | 'analytics'
  | 'admin_controls' | 'sla' | 'private_deployment';
type RateLimitAction = 'analyze' | 'reverse' | 'web_builder';

const PLAN_FEATURES: Record<PlanType, FeatureName[]> = {
  FREE: ['analyze', 'reverse'],
  PRO: ['analyze', 'reverse', 'web_builder', 'zero_knowledge', 'priority_ai'],
  TEAM: ['analyze', 'reverse', 'web_builder', 'zero_knowledge', 'priority_ai', 'team_dashboard', 'export'],
  BUSINESS: ['analyze', 'reverse', 'web_builder', 'zero_knowledge', 'priority_ai', 'team_dashboard', 'export', 'github', 'vercel', 'analytics'],
  ENTERPRISE: ['analyze', 'reverse', 'web_builder', 'zero_knowledge', 'priority_ai', 'team_dashboard', 'export', 'github', 'vercel', 'analytics', 'admin_controls', 'sla', 'private_deployment'],
};

const ACTION_COSTS: Record<string, number> = {
  debug_analyze: CREDIT_COSTS.DEBUG_ANALYSIS,
  debug: CREDIT_COSTS.DEBUG_ANALYSIS,
  reverse_debug: CREDIT_COSTS.REVERSE_DEBUGGING,
  web_builder_small: CREDIT_COSTS.WEB_BUILDER_SMALL,
  web_builder_medium: CREDIT_COSTS.WEB_BUILDER_MEDIUM,
  web_builder_large: CREDIT_COSTS.WEB_BUILDER_LARGE,
  save_session: CREDIT_COSTS.SAVE_SESSION,
  sandbox_create: CREDIT_COSTS.WEB_BUILDER_SMALL,
};

export async function getUserPlan(userId: string): Promise<PlanType> {
  let supabase: ReturnType<typeof createSupabaseAdmin> | null = null;
  try {
    supabase = createSupabaseAdmin();
  } catch (e) {
    // Dev ergonomics: allow the app to run without service role key.
    // In production you should always set SUPABASE_SERVICE_ROLE_KEY.
    console.warn('[plan-enforcement] SUPABASE_SERVICE_ROLE_KEY missing; defaulting plan to FREE');
    return 'FREE';
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('plan_type')
    .eq('id', userId)
    .single();

  if (error || !data?.plan_type) return 'FREE';
  const pt = data.plan_type as string;
  if (pt in PLANS) return pt as PlanType;
  return 'FREE';
}

export function checkFeatureAccess(plan: PlanType, feature: FeatureName): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

export async function requireFeature(userId: string, feature: FeatureName): Promise<{ allowed: boolean; plan: PlanType }> {
  const plan = await getUserPlan(userId);
  return { allowed: checkFeatureAccess(plan, feature), plan };
}

export async function checkRateLimit(userId: string, action: RateLimitAction): Promise<{ allowed: boolean; current: number; limit: number }> {
  const plan = await getUserPlan(userId);
  const planConfig = PLANS[plan];
  if (planConfig.rateLimit === -1) return { allowed: true, current: 0, limit: -1 };

  let supabase: ReturnType<typeof createSupabaseAdmin> | null = null;
  try {
    supabase = createSupabaseAdmin();
  } catch {
    // If we can't read rate-limit logs, fail open (the edge functions still meter credits).
    return { allowed: true, current: 0, limit: planConfig.rateLimit };
  }

  // Optional global throttle override (admin-controlled) so ops can clamp traffic without redeploying.
  // Applied as a hard ceiling on top of plan limits.
  let effectiveLimit: number = planConfig.rateLimit;
  try {
    const { data } = await supabase
      .from('throttle_config')
      .select('value')
      .eq('key', 'rate_limit_per_minute')
      .maybeSingle();
    const override = Number(data?.value);
    if (Number.isFinite(override) && override > 0) {
      effectiveLimit = Math.min(effectiveLimit, override);
    }
  } catch {
    // Best-effort: ignore if table missing or inaccessible
  }

  const windowStart = new Date(Date.now() - 60_000).toISOString();

  const { count, error } = await supabase
    .from('analytics_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', action)
    .gte('created_at', windowStart);

  const current = count ?? 0;
  return { allowed: current < effectiveLimit, current, limit: effectiveLimit };
}

function getClientIp(req?: NextRequest): string | null {
  if (!req) return null;
  const forwarded = req.headers.get('x-forwarded-for') || req.headers.get('X-Forwarded-For');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    return first || null;
  }
  // NextRequest may expose ip in some runtimes, but it's not guaranteed.
  // @ts-expect-error - runtime dependent
  return (req.ip as string | undefined) || null;
}

export async function logUsage(
  userId: string,
  action: RateLimitAction,
  opts?: { req?: NextRequest; creditsUsed?: number; modelUsed?: string | null }
): Promise<void> {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from('analytics_usage_logs').insert({
      user_id: userId,
      action_type: action,
      ip_address: getClientIp(opts?.req),
      credits_used: typeof opts?.creditsUsed === 'number' ? opts.creditsUsed : 1,
      model_used: opts?.modelUsed || null,
    });
  } catch {
    // Best-effort logging — never block the request
  }
}

export async function withRateLimit(
  userId: string,
  action: RateLimitAction
  ,
  opts?: { req?: NextRequest; creditsUsed?: number; modelUsed?: string | null }
): Promise<{ allowed: true } | { allowed: false; status: number; body: object }> {
  const result = await checkRateLimit(userId, action);

  if (!result.allowed) {
    // Best-effort audit event for ops visibility.
    logAuditEvent(userId, 'rate_limit.hit', {
      action,
      limit: result.limit,
      current: result.current,
    }).catch(() => {});
    return {
      allowed: false,
      status: 429,
      body: {
        error: 'Rate limit exceeded',
        limit: result.limit,
        current: result.current,
        retryAfter: 60,
      },
    };
  }

  await logUsage(userId, action, opts);
  return { allowed: true };
}

export function getActionCost(action: string): number {
  return ACTION_COSTS[action] ?? 1;
}
