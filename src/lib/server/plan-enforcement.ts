import 'server-only';

import { createSupabaseAdmin } from '@/lib/server/supabase-admin';
import { PLANS, CREDIT_COSTS } from '@/lib/constants';

type PlanType = keyof typeof PLANS;
type FeatureName = 'analyze' | 'reverse' | 'web_builder' | 'zero_knowledge' | 'priority_ai'
  | 'team_dashboard' | 'export' | 'github' | 'vercel' | 'analytics'
  | 'admin_controls' | 'sla' | 'private_deployment';

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
  const supabase = createSupabaseAdmin();
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

export async function checkRateLimit(userId: string, action: string): Promise<{ allowed: boolean; current: number; limit: number }> {
  const plan = await getUserPlan(userId);
  const planConfig = PLANS[plan];
  if (planConfig.rateLimit === -1) return { allowed: true, current: 0, limit: -1 };

  const supabase = createSupabaseAdmin();
  const windowStart = new Date(Date.now() - 60_000).toISOString();

  const { count, error } = await supabase
    .from('analytics_usage_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('action_type', action)
    .gte('created_at', windowStart);

  const current = count ?? 0;
  return { allowed: current < planConfig.rateLimit, current, limit: planConfig.rateLimit };
}

export function getActionCost(action: string): number {
  return ACTION_COSTS[action] ?? 1;
}
