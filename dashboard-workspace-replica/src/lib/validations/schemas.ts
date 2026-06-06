import { z } from 'zod';

/**
 * Shared validation schemas for API request bodies.
 * Applied in API routes via the validateBody helper.
 */

// ── AI Routes ──

export const generateSchema = z.object({
  threadId: z.string().uuid('threadId must be a valid UUID'),
  prompt: z.string().min(1, 'Prompt is required').max(10000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.string(),
  })).optional().default([]),
  idempotencyKey: z.string().optional(),
  persistUserMessage: z.boolean().optional().default(true),
  model: z.string().optional(),
});

export const debugSchema = z.object({
  threadId: z.string().uuid('threadId must be a valid UUID'),
  code: z.string().min(1, 'Code is required'),
  errorMessage: z.string().min(1, 'Error message is required'),
  prompt: z.string().optional(),
  language: z.string().optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system', 'tool']),
    content: z.string(),
  })).optional().default([]),
  idempotencyKey: z.string().optional(),
});

export const debugAnalyzeSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  errorMessage: z.string().optional(),
  language: z.string().optional(),
  stackTrace: z.string().optional(),
});

export const generateSchemaSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000),
  existingSchema: z.any().optional(),
});

// ── Deploy ──

export const deployTriggerSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  deploymentId: z.string().optional(),
  files: z.record(z.string(), z.string()),
  config: z.object({
    framework: z.string().optional(),
    buildCommand: z.string().optional(),
    outputDir: z.string().optional(),
    installCommand: z.string().optional(),
    env: z.record(z.string(), z.string()).optional(),
    region: z.string().optional(),
  }).optional(),
});

export const deployArchiveSchema = z.object({
  projectId: z.string().uuid('projectId must be a valid UUID'),
  deploymentId: z.string().min(1, 'deploymentId is required'),
  files: z.record(z.string(), z.string()),
  config: z.object({
    framework: z.string(),
    buildCommand: z.string(),
    outputDir: z.string(),
    installCommand: z.string(),
    env: z.record(z.string(), z.string()),
    region: z.string(),
  }),
});

// ── Projects ──

export const projectCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  prompt: z.string().optional(),
  code: z.string().optional(),
  language: z.string().optional(),
  framework: z.string().optional(),
  is_public: z.boolean().optional(),
});

export const projectUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  code: z.string().optional(),
  language: z.string().optional(),
  framework: z.string().optional(),
  is_public: z.boolean().optional(),
  prompt: z.string().optional(),
});

// ── Domains / Env Vars / Integrations ──

export const domainSchema = z.object({
  domain: z.string().min(1, 'Domain is required').regex(/^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]$/, 'Invalid domain format'),
});

export const envVarSchema = z.object({
  key: z.string().min(1).regex(/^[A-Z_][A-Z0-9_]*$/, 'Invalid env var key (UPPER_SNAKE_CASE)'),
  value: z.string(),
});

export const integrationSchema = z.object({
  provider: z.enum(['github', 'vercel', 'netlify', 'figma', 'linear']),
  config: z.record(z.string(), z.unknown()).optional(),
  accessToken: z.string().optional(),
});

// ── Checkout / Payment ──

export const checkoutSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  planType: z.enum(['pro', 'team', 'business', 'enterprise']),
});

// ── Referrals ──

export const referralTrackSchema = z.object({
  referralCode: z.string().min(1, 'Referral code is required'),
});

// ── Thread Messages ──

export const threadMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ── Helper ──

export type ZodValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; details: z.ZodError['issues'] };

/**
 * Validate a request body against a zod schema.
 * Returns parsed data or throws an ApiError for use in API routes.
 * Note: use validateBody from @/lib/validations/validate-body instead (avoids circular deps).
 */
export function safeValidateBody<T extends z.ZodTypeAny>(
  body: unknown,
  schema: T,
): { success: true; data: z.infer<T> } | { success: false; error: string; details: Array<{ path: string; message: string }> } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return {
      success: false,
      error: 'Request validation failed',
      details: result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      })),
    };
  }
  return { success: true, data: result.data };
}
