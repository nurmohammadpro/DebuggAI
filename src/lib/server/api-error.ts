/**
 * Standardized API Error Handling
 *
 * Provides a consistent error format across all API routes:
 *   { error: { code: string, message: string, details?: unknown } }
 */

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INSUFFICIENT_CREDITS'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

const STATUS_MAP: Record<ApiErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 400,
  INSUFFICIENT_CREDITS: 402,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  UPSTREAM_ERROR: 502,
  INTERNAL_ERROR: 500,
};

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = STATUS_MAP[code];
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }

  toResponse(extraHeaders?: HeadersInit): Response {
    return new Response(JSON.stringify(this.toJSON()), {
      status: this.status,
      headers: {
        'Content-Type': 'application/json',
        ...(extraHeaders as Record<string, string>),
      },
    });
  }
}

/**
 * Handle unexpected errors in API routes.
 * Logs the error and returns a standardized response.
 */
export function handleApiError(err: unknown): Response {
  if (err instanceof ApiError) {
    return err.toResponse();
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('Unhandled API error:', err);

  // In production, don't leak internal error details to the client
  const clientMessage = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : message;

  return new Response(
    JSON.stringify({
      error: {
        code: 'INTERNAL_ERROR',
        message: clientMessage,
      },
    }),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Simple validation error helper (used with or without zod)
 */
export function validationError(message: string, details?: unknown): ApiError {
  return new ApiError('VALIDATION_ERROR', message, details);
}

export function notFoundError(resource: string): ApiError {
  return new ApiError('NOT_FOUND', `${resource} not found`);
}

export function unauthorizedError(message = 'Authentication required'): ApiError {
  return new ApiError('UNAUTHORIZED', message);
}

export function forbiddenError(message = 'Access denied'): ApiError {
  return new ApiError('FORBIDDEN', message);
}
