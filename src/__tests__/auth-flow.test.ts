import { describe, it, expect } from 'vitest';
import { getBearerToken } from '@/lib/server/auth';
import { validateCsrfToken, requiresCsrfValidation, generateCsrfToken } from '@/lib/server/csrf';
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

    it('handles Bearer with extra whitespace', () => {
      const req = createMockRequest('Bearer   token_with_spaces');
      expect(getBearerToken(req)).toBe('token_with_spaces');
    });

    it('case insensitive on Bearer keyword', () => {
      const req = createMockRequest('bEaReR case_insensitive_token');
      expect(getBearerToken(req)).toBe('case_insensitive_token');
    });
  });
});

describe('CSRF protection integration', () => {
  it('CSRF validation rejects state-changing requests without proper tokens', () => {
    const req = new NextRequest('http://localhost/api/projects', { method: 'POST' });
    expect(requiresCsrfValidation(req)).toBe(true);
    expect(validateCsrfToken(req)).toBe(false);
  });

  it('CSRF validation allows safe methods without tokens', () => {
    const req = new NextRequest('http://localhost/api/projects', { method: 'GET' });
    expect(requiresCsrfValidation(req)).toBe(false);
  });

  it('full CSRF round-trip: generate, set cookie, validate', () => {
    const token = generateCsrfToken();
    const headers = new Headers();
    headers.set('x-csrf-token', token);
    const req = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      headers,
    });
    req.cookies.set('csrf_token', token);
    expect(validateCsrfToken(req)).toBe(true);
  });
});
