import { describe, it, expect } from 'vitest';
import { generateCsrfToken, validateCsrfToken, requiresCsrfValidation } from '@/lib/server/csrf';
import { NextRequest } from 'next/server';

describe('CSRF Protection', () => {
  describe('generateCsrfToken', () => {
    it('generates a 64-character hex token', () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('generates unique tokens on each call', () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateCsrfToken()));
      expect(tokens.size).toBe(100);
    });
  });

  describe('validateCsrfToken', () => {
    function createRequest(cookieValue?: string, headerValue?: string): NextRequest {
      const headers = new Headers();
      if (headerValue) headers.set('x-csrf-token', headerValue);
      const req = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers,
      });
      if (cookieValue) {
        req.cookies.set('csrf_token', cookieValue);
      }
      return req;
    }

    it('returns true when cookie and header match', () => {
      const token = generateCsrfToken();
      const req = createRequest(token, token);
      expect(validateCsrfToken(req)).toBe(true);
    });

    it('returns false when cookie is missing', () => {
      const req = createRequest(undefined, 'sometoken1234567890123456789012345678901234567890123456789012345678901234');
      expect(validateCsrfToken(req)).toBe(false);
    });

    it('returns false when header is missing', () => {
      const token = generateCsrfToken();
      const req = createRequest(token, undefined);
      expect(validateCsrfToken(req)).toBe(false);
    });

    it('returns false when cookie and header differ', () => {
      const cookieToken = generateCsrfToken();
      const headerToken = generateCsrfToken();
      const req = createRequest(cookieToken, headerToken);
      expect(validateCsrfToken(req)).toBe(false);
    });

    it('returns false for tokens of wrong length', () => {
      const short = 'abc123';
      const req = createRequest(short, short);
      expect(validateCsrfToken(req)).toBe(false);
    });

    it('returns false when header has different length than cookie', () => {
      const cookieToken = generateCsrfToken();
      const headerToken = cookieToken + 'extra';
      const req = createRequest(cookieToken, headerToken);
      expect(validateCsrfToken(req)).toBe(false);
    });
  });

  describe('requiresCsrfValidation', () => {
    it('requires CSRF for POST', () => {
      const req = new NextRequest('http://localhost/api/test', { method: 'POST' });
      expect(requiresCsrfValidation(req)).toBe(true);
    });

    it('requires CSRF for PUT', () => {
      const req = new NextRequest('http://localhost/api/test', { method: 'PUT' });
      expect(requiresCsrfValidation(req)).toBe(true);
    });

    it('requires CSRF for PATCH', () => {
      const req = new NextRequest('http://localhost/api/test', { method: 'PATCH' });
      expect(requiresCsrfValidation(req)).toBe(true);
    });

    it('requires CSRF for DELETE', () => {
      const req = new NextRequest('http://localhost/api/test', { method: 'DELETE' });
      expect(requiresCsrfValidation(req)).toBe(true);
    });

    it('does NOT require CSRF for GET', () => {
      const req = new NextRequest('http://localhost/api/test', { method: 'GET' });
      expect(requiresCsrfValidation(req)).toBe(false);
    });

    it('does NOT require CSRF for HEAD', () => {
      const req = new NextRequest('http://localhost/api/test', { method: 'HEAD' });
      expect(requiresCsrfValidation(req)).toBe(false);
    });

    it('does NOT require CSRF for OPTIONS', () => {
      const req = new NextRequest('http://localhost/api/test', { method: 'OPTIONS' });
      expect(requiresCsrfValidation(req)).toBe(false);
    });
  });
});
