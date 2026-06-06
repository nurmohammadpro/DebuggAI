import { describe, it, expect } from 'vitest';
import { CREDIT_COSTS, PLANS } from '@/lib/constants';
import { getActionCost } from '@/lib/server/plan-enforcement';

describe('Credit System', () => {
  describe('CREDIT_COSTS', () => {
    it('debug analysis costs 1 credit', () => {
      expect(CREDIT_COSTS.DEBUG_ANALYSIS).toBe(1);
    });

    it('reverse debugging costs 2 credits', () => {
      expect(CREDIT_COSTS.REVERSE_DEBUGGING).toBe(2);
    });

    it('web builder costs scale properly', () => {
      expect(CREDIT_COSTS.WEB_BUILDER_SMALL).toBe(20);
      expect(CREDIT_COSTS.WEB_BUILDER_MEDIUM).toBe(50);
      expect(CREDIT_COSTS.WEB_BUILDER_LARGE).toBe(100);
      expect(CREDIT_COSTS.WEB_BUILDER_SMALL).toBeLessThan(CREDIT_COSTS.WEB_BUILDER_MEDIUM);
      expect(CREDIT_COSTS.WEB_BUILDER_MEDIUM).toBeLessThan(CREDIT_COSTS.WEB_BUILDER_LARGE);
    });

    it('save session costs 10 credits', () => {
      expect(CREDIT_COSTS.SAVE_SESSION).toBe(10);
    });

    it('all costs are positive', () => {
      for (const cost of Object.values(CREDIT_COSTS)) {
        expect(cost).toBeGreaterThan(0);
      }
    });
  });

  describe('PLANS', () => {
    it('has all plan tiers', () => {
      expect(Object.keys(PLANS)).toEqual(['FREE', 'PRO', 'TEAM', 'BUSINESS', 'ENTERPRISE']);
    });

    it('FREE tier has the lowest credits', () => {
      const credits = Object.values(PLANS).map((p) => p.creditsPerMonth);
      expect(PLANS.FREE.creditsPerMonth).toBe(Math.min(...credits));
    });

    it('ENTERPRISE has unlimited rate limit', () => {
      expect(PLANS.ENTERPRISE.rateLimit).toBe(-1);
    });

    it('paid plans have more credits than FREE', () => {
      expect(PLANS.PRO.creditsPerMonth).toBeGreaterThan(PLANS.FREE.creditsPerMonth);
      expect(PLANS.TEAM.creditsPerMonth).toBeGreaterThan(PLANS.PRO.creditsPerMonth);
      expect(PLANS.BUSINESS.creditsPerMonth).toBeGreaterThan(PLANS.TEAM.creditsPerMonth);
      expect(PLANS.ENTERPRISE.creditsPerMonth).toBeGreaterThan(PLANS.BUSINESS.creditsPerMonth);
    });

    it('plan pricing is consistent', () => {
      expect(PLANS.PRO.price).toBeGreaterThan(0);
      expect(PLANS.TEAM.price).toBeGreaterThan(PLANS.PRO.price!);
      expect(PLANS.BUSINESS.price).toBeGreaterThan(PLANS.TEAM.price!);
      expect(PLANS.ENTERPRISE.price).toBeGreaterThan(PLANS.BUSINESS.price!);
    });
  });

  describe('getActionCost', () => {
    it('returns correct cost for debug actions', () => {
      expect(getActionCost('debug')).toBe(1);
      expect(getActionCost('debug_analyze')).toBe(1);
      expect(getActionCost('reverse_debug')).toBe(2);
    });

    it('returns correct cost for web builder actions', () => {
      expect(getActionCost('web_builder_small')).toBe(20);
      expect(getActionCost('web_builder_medium')).toBe(50);
      expect(getActionCost('web_builder_large')).toBe(100);
    });

    it('returns correct cost for sandbox', () => {
      expect(getActionCost('sandbox_create')).toBe(20);
    });

    it('returns 1 as default for unknown actions', () => {
      expect(getActionCost('unknown_action')).toBe(1);
    });
  });
});
