import { describe, it, expect } from 'vitest';
import { PLANS } from '@/lib/constants';

describe('Rate Limiting Logic', () => {
  describe('Plan rate limits', () => {
    it('FREE plan has 10 req/min', () => {
      expect(PLANS.FREE.rateLimit).toBe(10);
    });

    it('PRO plan has 30 req/min', () => {
      expect(PLANS.PRO.rateLimit).toBe(30);
    });

    it('TEAM plan has 60 req/min', () => {
      expect(PLANS.TEAM.rateLimit).toBe(60);
    });

    it('BUSINESS plan has 120 req/min', () => {
      expect(PLANS.BUSINESS.rateLimit).toBe(120);
    });

    it('ENTERPRISE plan has unlimited rate (-1)', () => {
      expect(PLANS.ENTERPRISE.rateLimit).toBe(-1);
    });
  });

  describe('Rate limit scaling', () => {
    it('each higher tier has a higher (or unlimited) rate limit', () => {
      const plans = [PLANS.FREE, PLANS.PRO, PLANS.TEAM, PLANS.BUSINESS, PLANS.ENTERPRISE];
      for (let i = 0; i < plans.length - 2; i++) {
        expect(plans[i].rateLimit).toBeLessThan(plans[i + 1].rateLimit);
      }
      // Last (ENTERPRISE) is unlimited
      expect(plans[plans.length - 1].rateLimit).toBe(-1);
    });
  });
});
