import { describe, it, expect } from 'vitest';
import { getBearerToken } from '@/lib/server/auth';
import { NextRequest } from 'next/server';

function createMockRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set('Authorization', authHeader);
  return new NextRequest('http://localhost/api/test', { headers });
}

describe('Auth Utilities', () => {
  describe('getBearerToken', () => {
    it('extracts token from Authorization header', () => {
      const req = createMockRequest('Bearer test_token_123');
      expect(getBearerToken(req)).toBe('test_token_123');
    });

    it('returns null when no Authorization header', () => {
      const req = createMockRequest();
      expect(getBearerToken(req)).toBeNull();
    });

    it('returns null for non-Bearer auth', () => {
      const req = createMockRequest('Basic dXNlcjpwYXNz');
      expect(getBearerToken(req)).toBeNull();
    });

    it('returns null for empty Bearer token', () => {
      const req = createMockRequest('Bearer ');
      expect(getBearerToken(req)).toBeNull();
    });

    it('handles lowercase authorization header', () => {
      const headers = new Headers();
      headers.set('authorization', 'Bearer lowercase_token');
      const req = new NextRequest('http://localhost/api/test', { headers });
      expect(getBearerToken(req)).toBe('lowercase_token');
    });

    it('handles token with special characters', () => {
      const token = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8';
      const req = createMockRequest(`Bearer ${token}`);
      expect(getBearerToken(req)).toBe(token);
    });
  });
});
