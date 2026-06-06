import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ApiError, handleApiError, validationError, notFoundError, unauthorizedError, forbiddenError } from '@/lib/server/api-error';

describe('ApiError', () => {
  it('creates an error with correct status code', () => {
    const err = new ApiError('NOT_FOUND', 'User not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.message).toBe('User not found');
  });

  it('maps all error codes to correct HTTP statuses', () => {
    const cases: Array<[string, number]> = [
      ['UNAUTHORIZED', 401],
      ['FORBIDDEN', 403],
      ['NOT_FOUND', 404],
      ['VALIDATION_ERROR', 400],
      ['INSUFFICIENT_CREDITS', 402],
      ['RATE_LIMITED', 429],
      ['CONFLICT', 409],
      ['UPSTREAM_ERROR', 502],
      ['INTERNAL_ERROR', 500],
    ];
    for (const [code, status] of cases) {
      const err = new ApiError(code as any, 'test');
      expect(err.status).toBe(status);
    }
  });

  it('serializes to JSON without details', () => {
    const err = new ApiError('UNAUTHORIZED', 'Auth required');
    expect(err.toJSON()).toEqual({
      error: { code: 'UNAUTHORIZED', message: 'Auth required' },
    });
  });

  it('serializes to JSON with details', () => {
    const err = new ApiError('VALIDATION_ERROR', 'Invalid input', [
      { field: 'email', message: 'Required' },
    ]);
    expect(err.toJSON()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: [{ field: 'email', message: 'Required' }],
      },
    });
  });

  it('toResponse returns a Response object', async () => {
    const err = new ApiError('FORBIDDEN', 'Access denied');
    const res = err.toResponse();
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('toResponse accepts extra headers', () => {
    const err = new ApiError('UNAUTHORIZED', 'No access');
    const res = err.toResponse({ 'X-Custom': 'value' });
    expect(res.headers.get('X-Custom')).toBe('value');
  });
});

describe('handleApiError', () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    console.error = () => {};
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    vi.unstubAllEnvs();
  });

  it('passes through ApiError responses', () => {
    const err = new ApiError('NOT_FOUND', 'Resource not found');
    const res = handleApiError(err);
    expect(res.status).toBe(404);
  });

  it('wraps regular Error with INTERNAL_ERROR', () => {
    const err = new Error('Something broke');
    const res = handleApiError(err);
    expect(res.status).toBe(500);
  });

  it('handles non-Error throws (string)', () => {
    const res = handleApiError('just a string');
    expect(res.status).toBe(500);
  });

  it('handles null/undefined', () => {
    const res = handleApiError(null);
    expect(res.status).toBe(500);
  });

  it('leaks error message in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const res = handleApiError(new Error('dev details'));
    const body = await res.json();
    expect(body.error.message).toBe('dev details');
  });

  it('hides error message in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const res = handleApiError(new Error('secret internals'));
    const body = await res.json();
    expect(body.error.message).toBe('An unexpected error occurred');
    expect(body.error.message).not.toContain('secret');
  });
});

describe('error helpers', () => {
  it('validationError creates a VALIDATION_ERROR', () => {
    const err = validationError('Bad input', { field: 'name' });
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(400);
    expect(err.details).toEqual({ field: 'name' });
  });

  it('notFoundError creates a NOT_FOUND with resource name', () => {
    const err = notFoundError('Project');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Project not found');
  });

  it('unauthorizedError has a default message', () => {
    const err = unauthorizedError();
    expect(err.message).toBe('Authentication required');
  });

  it('forbiddenError has a default message', () => {
    const err = forbiddenError();
    expect(err.message).toBe('Access denied');
  });
});
