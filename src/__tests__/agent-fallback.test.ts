import { describe, expect, it } from 'vitest';
import { shouldFallbackFromAgentStatus } from '@/hooks/use-generation';

describe('agent generation fallback', () => {
  it('only falls back to legacy generation when the agent route is unavailable', () => {
    expect(shouldFallbackFromAgentStatus(404)).toBe(true);
    expect(shouldFallbackFromAgentStatus(405)).toBe(true);
    expect(shouldFallbackFromAgentStatus(501)).toBe(true);
  });

  it('does not fallback on provider, auth, rate-limit, or server errors', () => {
    expect(shouldFallbackFromAgentStatus(400)).toBe(false);
    expect(shouldFallbackFromAgentStatus(401)).toBe(false);
    expect(shouldFallbackFromAgentStatus(429)).toBe(false);
    expect(shouldFallbackFromAgentStatus(500)).toBe(false);
    expect(shouldFallbackFromAgentStatus(503)).toBe(false);
  });
});
