import { describe, it, expect } from 'vitest';
import { generateCsrfToken, getCsrfCookieHeader, validateCsrfToken, requiresCsrfValidation } from '@/lib/server/csrf';
import { NextRequest } from 'next/server';

describe('Middleware — Security Headers & CSRF', () => {
  describe('CSRF cookie header format', () => {
    it('getCsrfCookieHeader produces a valid Set-Cookie value', () => {
      const token = generateCsrfToken();
      const header = getCsrfCookieHeader(token);
      expect(header).toContain('csrf_token=');
      expect(header).toContain('SameSite=Strict');
      expect(header).toContain('Secure');
      expect(header).toContain('Max-Age=86400');
      expect(header).toContain('Path=/');
      // NOT HttpOnly — JS must read this cookie for the double-submit pattern
      expect(header).not.toContain('HttpOnly');
    });
  });

  describe('CSRF validation on API routes', () => {
    it('rejects POST without CSRF tokens', () => {
      const req = new NextRequest('http://localhost/api/projects', { method: 'POST' });
      expect(requiresCsrfValidation(req)).toBe(true);
      expect(validateCsrfToken(req)).toBe(false);
    });

    it('rejects DELETE without CSRF tokens', () => {
      const req = new NextRequest('http://localhost/api/projects/123', { method: 'DELETE' });
      expect(requiresCsrfValidation(req)).toBe(true);
      expect(validateCsrfToken(req)).toBe(false);
    });

    it('rejects PUT without CSRF tokens', () => {
      const req = new NextRequest('http://localhost/api/projects/123', { method: 'PUT' });
      expect(requiresCsrfValidation(req)).toBe(true);
      expect(validateCsrfToken(req)).toBe(false);
    });

    it('rejects PATCH without CSRF tokens', () => {
      const req = new NextRequest('http://localhost/api/notifications', { method: 'PATCH' });
      expect(requiresCsrfValidation(req)).toBe(true);
      expect(validateCsrfToken(req)).toBe(false);
    });

    it('allows GET without CSRF tokens', () => {
      const req = new NextRequest('http://localhost/api/projects', { method: 'GET' });
      expect(requiresCsrfValidation(req)).toBe(false);
    });

    it('allows HEAD without CSRF tokens', () => {
      const req = new NextRequest('http://localhost/api/health', { method: 'HEAD' });
      expect(requiresCsrfValidation(req)).toBe(false);
    });

    it('allows OPTIONS without CSRF tokens', () => {
      const req = new NextRequest('http://localhost/api/generate', { method: 'OPTIONS' });
      expect(requiresCsrfValidation(req)).toBe(false);
    });

    it('accepts valid CSRF token pair', () => {
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

    it('rejects mismatched CSRF token pair', () => {
      const cookieToken = generateCsrfToken();
      const headerToken = generateCsrfToken();
      const headers = new Headers();
      headers.set('x-csrf-token', headerToken);
      const req = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers,
      });
      req.cookies.set('csrf_token', cookieToken);
      expect(validateCsrfToken(req)).toBe(false);
    });

    it('rejects when only cookie is set but no header', () => {
      const token = generateCsrfToken();
      const req = new NextRequest('http://localhost/api/projects', { method: 'POST' });
      req.cookies.set('csrf_token', token);
      expect(validateCsrfToken(req)).toBe(false);
    });

    it('rejects when only header is set but no cookie', () => {
      const token = generateCsrfToken();
      const headers = new Headers();
      headers.set('x-csrf-token', token);
      const req = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        headers,
      });
      expect(validateCsrfToken(req)).toBe(false);
    });
  });

  describe('Public paths should bypass CSRF', () => {
    // These paths are skipped in the middleware CSRF check
    const skipPaths = ['/api/health', '/api/contact', '/api/newsletter'];

    for (const path of skipPaths) {
      it(`${path} POST is marked as needing CSRF but middleware skips it`, () => {
        const req = new NextRequest(`http://localhost${path}`, { method: 'POST' });
        // The CSRF module itself says POST needs validation, but the middleware
        // has a skip list. This test verifies the module behavior is correct.
        expect(requiresCsrfValidation(req)).toBe(true);
      });
    }
  });
});
