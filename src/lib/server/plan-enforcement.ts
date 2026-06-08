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

// ── In-memory plan cache ────────────────────────────────────────────────
const PLAN_CACHE_TTL_MS = 30_000;

const planCache = new Map<string, { plan: PlanType; expiresAt: number }>();

function getCachedPlan(userId: string): PlanType | null {
  const entry = planCache.get(userId);
  if (entry && Date.now() < entry.expiresAt) return entry.plan;
  if (entry) planCache.delete(userId);
  return null;
}

function setCachedPlan(userId: string, plan: PlanType): void {
  planCache.set(userId, { plan, expiresAt: Date.now() + PLAN_CACHE_TTL_MS });
}

if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of planCache) {
      if (now >= entry.expiresAt) planCache.delete(key);
    }
  }, 300_000).unref?.();
}

export async function getUserPlan(userId: string): Promise<PlanType> {
  const cached = getCachedPlan(userId);
  if (cached) return cached;

  let supabase: ReturnType<typeof createSupabaseAdmin> | null = null;
  try {
    supabase = createSupabaseAdmin();
  } catch (e) {
    console.warn('[plan-enforcement] SUPABASE_SERVICE_ROLE_KEY missing; defaulting plan to FREE');
    return 'FREE';
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('plan_type')
    .eq('id', userId)
    .single();

  let plan: PlanType = 'FREE';
  if (!error && data?.plan_type) {
    const pt = data.plan_type as string;
    if (pt in PLANS) plan = pt as PlanType;
  }

  setCachedPlan(userId, plan);
  return plan;
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

async function logAbuseEvent(opts: { userId: string; action: RateLimitAction; req?: NextRequest; limit: number; current: number }) {
  try {
    const supabase = createSupabaseAdmin();
    await supabase.from('abuse_events').insert({
      user_id: opts.userId,
      ip_address: getClientIp(opts.req),
      event_type: 'rate_limit_hit',
      endpoint: opts.req?.nextUrl?.pathname || null,
      metadata: {
        action: opts.action,
        limit: opts.limit,
        current: opts.current,
      },
    });
  } catch {
    // best-effort
  }
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

async function checkAndLogRateLimitRpc(
  userId: string,
  action: RateLimitAction,
  opts?: { req?: NextRequest; creditsUsed?: number; modelUsed?: string | null }
): Promise<{ allowed: boolean; current: number; limit: number; plan: PlanType }> {
  const supabase = createSupabaseAdmin();
  const ip = getClientIp(opts?.req);
  const { data, error } = await supabase.rpc('check_and_log_rate_limit', {
    p_user_id: userId,
    p_action_type: action,
    p_ip_address: ip || null,
    p_credits_used: typeof opts?.creditsUsed === 'number' ? opts.creditsUsed : 1,
    p_model_used: opts?.modelUsed || null,
  });

  if (error || !data) {
    console.warn('[plan-enforcement] RPC check_and_log_rate_limit failed, falling back:', error?.message);
    await logUsage(userId, action, opts);
    const result = await checkRateLimit(userId, action);
    return { allowed: result.allowed, current: result.current, limit: result.limit, plan: 'FREE' };
  }

  const result = data as { allowed: boolean; current: number; limit: number; plan: string };
  return {
    allowed: result.allowed,
    current: result.current,
    limit: result.limit,
    plan: (result.plan as string) in PLANS ? (result.plan as PlanType) : 'FREE',
  };
}

export async function withRateLimit(
  userId: string,
  action: RateLimitAction
  ,
  opts?: { req?: NextRequest; creditsUsed?: number; modelUsed?: string | null }
): Promise<{ allowed: true } | { allowed: false; status: number; body: object }> {
  // Combined RPC replaces 4 sequential calls (logUsage + getUserPlan +
  // throttle_config + COUNT) with a single round-trip.
  const result = await checkAndLogRateLimitRpc(userId, action, opts);

  if (!result.allowed) {
    logAuditEvent(userId, 'rate_limit.hit', {
      action,
      limit: result.limit,
      current: result.current,
    }, undefined, undefined, { req: opts?.req }).catch(() => {});
    logAbuseEvent({
      userId,
      action,
      req: opts?.req,
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

  return { allowed: true };
}

export function getActionCost(action: string): number {
  return ACTION_COSTS[action] ?? 1;
}

// ── Per-IP rate limiting ────────────────────────────────────────────────
// Simple in-process bucket (restarts clear it — acceptable for abuse
// prevention; upgrade to Redis/PG for production).

const IP_BUCKETS = new Map<string, { count: number; resetAt: number }>();
const IP_WINDOW_MS = 60_000;   // 1 minute window
const IP_MAX_REQUESTS = 30;    // 30 req/min per IP (generous — catches scripted abuse)

function getClientIP(req?: NextRequest): string | null {
  if (!req) return null;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || null;
}

/**
 * Check per-IP rate limit bucket. Separate from per-user limits —
 * this catches unauthenticated or anonymous abuse patterns.
 */
export function checkIPRateLimit(
  req?: NextRequest,
): { allowed: boolean; retryAfter?: number } {
  const ip = getClientIP(req);
  if (!ip) return { allowed: true }; // Can't identify — allow through

  const now = Date.now();
  let bucket = IP_BUCKETS.get(ip);

  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 1, resetAt: now + IP_WINDOW_MS };
    IP_BUCKETS.set(ip, bucket);
    return { allowed: true };
  }

  bucket.count++;

  if (bucket.count > IP_MAX_REQUESTS) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

// Periodic cleanup of stale IP buckets (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, bucket] of IP_BUCKETS) {
      if (now > bucket.resetAt) IP_BUCKETS.delete(ip);
    }
  }, 300_000).unref?.();
}
