import { describe, it, expect } from 'vitest';
import { CREDIT_COSTS, PLANS } from '@/lib/constants';

describe('Credit Costs', () => {
  it('has valid debug analysis cost', () => {
    expect(CREDIT_COSTS.DEBUG_ANALYSIS).toBeGreaterThan(0);
  });

  it('has valid web builder costs', () => {
    expect(CREDIT_COSTS.WEB_BUILDER_SMALL).toBeGreaterThan(0);
    expect(CREDIT_COSTS.WEB_BUILDER_MEDIUM).toBeGreaterThan(CREDIT_COSTS.WEB_BUILDER_SMALL);
    expect(CREDIT_COSTS.WEB_BUILDER_LARGE).toBeGreaterThan(CREDIT_COSTS.WEB_BUILDER_MEDIUM);
  });

  it('has valid plan definitions', () => {
    expect(PLANS.FREE).toBeDefined();
    expect(PLANS.PRO).toBeDefined();
    expect(PLANS.ENTERPRISE).toBeDefined();
    expect(PLANS.FREE.creditsPerMonth).toBe(30);
    expect(PLANS.PRO.price).toBeGreaterThan(0);
    expect(PLANS.ENTERPRISE.creditsPerMonth).toBe(-1);
  });
});
