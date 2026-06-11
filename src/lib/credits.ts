/**
 * Credit Costs — canonical source for all credit pricing.
 *
 * Import from here instead of hardcoding numbers in API routes.
 * Underlying values live in constants.ts so server-only code (plan-enforcement)
 * can import them without pulling client-safe utilities.
 */

export { CREDIT_COSTS } from '@/lib/constants';

import { CREDIT_COSTS } from '@/lib/constants';

/** Human-readable labels for credit actions (used in UI + audit logs). */
export const CREDIT_ACTION_LABELS: Record<string, string> = {
  debug_analyze: 'Debug Analysis',
  debug: 'Debug Analysis',
  reverse_debug: 'Reverse Debugging',
  web_builder_small: 'Web Builder (Small)',
  web_builder_medium: 'Web Builder (Medium)',
  web_builder_large: 'Web Builder (Large)',
  save_session: 'Save Session',
  sandbox_create: 'Sandbox Creation',
};

/**
 * Look up the flat credit cost for a named action.
 * Falls back to 1 if the action is unrecognised (safe default).
 */
export function getCreditCost(action: string): number {
  const COSTS: Record<string, number> = {
    debug_analyze: CREDIT_COSTS.DEBUG_ANALYSIS,
    debug: CREDIT_COSTS.DEBUG_ANALYSIS,
    reverse_debug: CREDIT_COSTS.REVERSE_DEBUGGING,
    web_builder_small: CREDIT_COSTS.WEB_BUILDER_SMALL,
    web_builder_medium: CREDIT_COSTS.WEB_BUILDER_MEDIUM,
    web_builder_large: CREDIT_COSTS.WEB_BUILDER_LARGE,
    save_session: CREDIT_COSTS.SAVE_SESSION,
    sandbox_create: CREDIT_COSTS.WEB_BUILDER_SMALL,
  };
  return COSTS[action] ?? 1;
}

/**
 * Credit costs broken out by model tier so the caller can select the right
 * tier without hardcoding numbers.
 */
export const MODEL_CREDIT_COSTS = {
  /** Fast / cheap models (e.g. Groq LLaMA) */
  fast: 1,
  /** Balanced models (e.g. DeepSeek V3, GPT-4o-mini) */
  balanced: 2,
  /** Powerful models (e.g. Claude Opus, GPT-4o) */
  powerful: 5,
  /** Reasoning / agentic loops */
  agent_turn: 3,
} as const;
