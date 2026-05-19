import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CREDIT_COSTS, PLANS } from '@/lib/constants';

describe('Credits Service', () => {
  describe('Credit Costs', () => {
    it('defines cost for all operations', () => {
      expect(CREDIT_COSTS.DEBUG_ANALYSIS).toBeGreaterThan(0);
      expect(CREDIT_COSTS.REVERSE_DEBUGGING).toBeGreaterThan(0);
      expect(CREDIT_COSTS.WEB_BUILDER_SMALL).toBeGreaterThan(0);
      expect(CREDIT_COSTS.WEB_BUILDER_MEDIUM).toBeGreaterThan(CREDIT_COSTS.WEB_BUILDER_SMALL);
      expect(CREDIT_COSTS.WEB_BUILDER_LARGE).toBeGreaterThan(CREDIT_COSTS.WEB_BUILDER_MEDIUM);
      expect(CREDIT_COSTS.SAVE_SESSION).toBeGreaterThan(0);
    });

    it('ensures web builder costs scale appropriately', () => {
      const { WEB_BUILDER_SMALL, WEB_BUILDER_MEDIUM, WEB_BUILDER_LARGE } = CREDIT_COSTS;
      expect(WEB_BUILDER_MEDIUM).toBeGreaterThanOrEqual(WEB_BUILDER_SMALL * 2);
      expect(WEB_BUILDER_LARGE).toBeGreaterThan(WEB_BUILDER_MEDIUM);
    });

    it('has non-negative costs for all keys', () => {
      Object.entries(CREDIT_COSTS).forEach(([key, value]) => {
        expect(value, `${key} should be >= 0`).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Plan Definitions', () => {
    it('has all plan tiers defined', () => {
      expect(PLANS.FREE).toBeDefined();
      expect(PLANS.PRO).toBeDefined();
      expect(PLANS.TEAM).toBeDefined();
      expect(PLANS.BUSINESS).toBeDefined();
      expect(PLANS.ENTERPRISE).toBeDefined();
    });

    it('ensures Free tier has limited credits', () => {
      expect(PLANS.FREE.creditsPerMonth).toBe(30);
      expect(PLANS.FREE.rateLimit).toBe(10);
    });

    it('ensures paid plans have more credits than Free', () => {
      expect(PLANS.PRO.creditsPerMonth).toBeGreaterThan(PLANS.FREE.creditsPerMonth);
      expect(PLANS.TEAM.creditsPerMonth).toBeGreaterThan(PLANS.PRO.creditsPerMonth);
      expect(PLANS.BUSINESS.creditsPerMonth).toBeGreaterThan(PLANS.TEAM.creditsPerMonth);
    });

    it('ensures Enterprise plan credits are greater than Business', () => {
      expect(PLANS.ENTERPRISE.creditsPerMonth).toBeGreaterThan(PLANS.BUSINESS.creditsPerMonth);
    });

    it('has consistent pricing structure', () => {
      expect(PLANS.PRO.price).toBeGreaterThan(0);
      expect(PLANS.TEAM.price).toBeGreaterThan(PLANS.PRO.price);
      expect(PLANS.BUSINESS.price).toBeGreaterThan(PLANS.TEAM.price);
      expect(PLANS.ENTERPRISE.price).toBeGreaterThan(PLANS.BUSINESS.price);
    });

    it('has names for all plans', () => {
      expect(PLANS.FREE.name).toBeTruthy();
      expect(PLANS.PRO.name).toBeTruthy();
      expect(PLANS.TEAM.name).toBeTruthy();
      expect(PLANS.BUSINESS.name).toBeTruthy();
      expect(PLANS.ENTERPRISE.name).toBeTruthy();
    });
  });
});
