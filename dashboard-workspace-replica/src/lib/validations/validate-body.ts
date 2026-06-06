import { z } from 'zod';
import { ApiError } from '@/lib/server/api-error';
import type { ZodTypeAny } from 'zod';

/**
 * Validate a request body against a zod schema.
 * Returns parsed data or throws an ApiError.
 */
export function validateBody<T extends ZodTypeAny>(
  body: unknown,
  schema: T,
): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    throw new ApiError('VALIDATION_ERROR', 'Request validation failed', details);
  }
  return result.data;
}
