import { describe, it, expect } from 'vitest';
import {
  ApiError,
  handleApiError,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
} from '@/lib/server/api-error';

describe('ApiError', () => {
  it('creates errors with correct status codes', () => {
    const err = new ApiError('NOT_FOUND', 'User not found');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.status).toBe(404);
    expect(err.message).toBe('User not found');
  });

  it('maps all error codes to correct statuses', () => {
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

  it('includes details when provided', () => {
    const err = new ApiError('VALIDATION_ERROR', 'Bad input', [
      { path: 'email', message: 'Invalid email' },
    ]);
    expect(err.details).toEqual([{ path: 'email', message: 'Invalid email' }]);
  });

  it('serializes to JSON correctly', () => {
    const err = new ApiError('NOT_FOUND', 'Project not found');
    expect(err.toJSON()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Project not found',
      },
    });
  });

  it('serializes with details', () => {
    const err = new ApiError('VALIDATION_ERROR', 'Bad input', { fields: ['name'] });
    expect(err.toJSON()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Bad input',
        details: { fields: ['name'] },
      },
    });
  });

  it('creates a proper Response', async () => {
    const err = new ApiError('UNAUTHORIZED', 'Login required');
    const res = err.toResponse();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('includes extra headers in response', () => {
    const err = new ApiError('RATE_LIMITED', 'Too many requests');
    const res = err.toResponse({ 'Retry-After': '60' });
    expect(res.headers.get('Retry-After')).toBe('60');
  });
});

describe('handleApiError', () => {
  it('passes through ApiError instances', () => {
    const original = new ApiError('NOT_FOUND', 'Missing');
    const response = handleApiError(original);
    expect(response.status).toBe(404);
  });

  it('wraps regular errors as INTERNAL_ERROR', async () => {
    const response = handleApiError(new Error('Something broke'));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('handles string errors', async () => {
    const response = handleApiError('plain string error');
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('handles null/undefined', async () => {
    const response = handleApiError(null);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('Error helpers', () => {
  it('validationError creates correct error', () => {
    const err = validationError('Name is required');
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.status).toBe(400);
  });

  it('notFoundError creates correct error', () => {
    const err = notFoundError('User');
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('User not found');
  });

  it('unauthorizedError has default message', () => {
    const err = unauthorizedError();
    expect(err.code).toBe('UNAUTHORIZED');
    expect(err.message).toBe('Authentication required');
  });

  it('forbiddenError has default message', () => {
    const err = forbiddenError();
    expect(err.code).toBe('FORBIDDEN');
    expect(err.message).toBe('Access denied');
  });
});
