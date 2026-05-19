import { describe, it, expect } from 'vitest';
import { safeValidateBody, generateSchema, debugSchema, deployArchiveSchema, projectCreateSchema, checkoutSchema, domainSchema, envVarSchema, integrationSchema } from '@/lib/validations/schemas';

describe('Validation Schemas', () => {
  describe('generateSchema', () => {
    it('validates a correct generate request', () => {
      const result = safeValidateBody({
        threadId: '00000000-0000-4000-8000-000000000001',
        prompt: 'Create a login form',
      }, generateSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.prompt).toBe('Create a login form');
        expect(result.data.persistUserMessage).toBe(true);
      }
    });

    it('rejects missing threadId', () => {
      const result = safeValidateBody({ prompt: 'test' }, generateSchema);
      expect(result.success).toBe(false);
    });

    it('rejects missing prompt', () => {
      const result = safeValidateBody({
        threadId: '00000000-0000-4000-8000-000000000001',
      }, generateSchema);
      expect(result.success).toBe(false);
    });

    it('rejects non-UUID threadId', () => {
      const result = safeValidateBody({
        threadId: 'not-a-uuid',
        prompt: 'test',
      }, generateSchema);
      expect(result.success).toBe(false);
    });

    it('rejects empty prompt', () => {
      const result = safeValidateBody({
        threadId: '00000000-0000-4000-8000-000000000001',
        prompt: '',
      }, generateSchema);
      expect(result.success).toBe(false);
    });

    it('accepts optional fields', () => {
      const result = safeValidateBody({
        threadId: '00000000-0000-4000-8000-000000000001',
        prompt: 'test',
        history: [{ role: 'user', content: 'hi' }],
        idempotencyKey: 'key-123',
        persistUserMessage: false,
      }, generateSchema);
      expect(result.success).toBe(true);
    });
  });

  describe('debugSchema', () => {
    it('validates a correct debug request', () => {
      const result = safeValidateBody({
        threadId: '00000000-0000-4000-8000-000000000001',
        code: 'console.log("hello")',
        errorMessage: 'undefined is not a function',
      }, debugSchema);
      expect(result.success).toBe(true);
    });

    it('rejects missing code', () => {
      const result = safeValidateBody({
        threadId: '00000000-0000-4000-8000-000000000001',
        errorMessage: 'error',
      }, debugSchema);
      expect(result.success).toBe(false);
    });

    it('rejects missing errorMessage', () => {
      const result = safeValidateBody({
        threadId: '00000000-0000-4000-8000-000000000001',
        code: 'x = 1',
      }, debugSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('deployArchiveSchema', () => {
    it('validates a correct deploy archive request', () => {
      const result = safeValidateBody({
        projectId: '00000000-0000-4000-8000-000000000001',
        deploymentId: 'deploy_123',
        files: { 'src/index.ts': 'console.log("ok")' },
        config: {
          framework: 'nextjs',
          buildCommand: 'npm run build',
          outputDir: '.next',
          installCommand: 'npm install',
          env: { NODE_ENV: 'production' },
          region: 'iad1',
        },
      }, deployArchiveSchema);
      expect(result.success).toBe(true);
    });

    it('rejects missing files', () => {
      const result = safeValidateBody({
        projectId: '00000000-0000-4000-8000-000000000001',
        deploymentId: 'deploy_123',
        config: { framework: 'nextjs', buildCommand: '', outputDir: '', installCommand: '', env: {}, region: '' },
      }, deployArchiveSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('projectCreateSchema', () => {
    it('validates a correct project create request', () => {
      const result = safeValidateBody({ name: 'My Project' }, projectCreateSchema);
      expect(result.success).toBe(true);
    });

    it('rejects empty name', () => {
      const result = safeValidateBody({ name: '' }, projectCreateSchema);
      expect(result.success).toBe(false);
    });

    it('rejects name over 200 chars', () => {
      const result = safeValidateBody({ name: 'x'.repeat(201) }, projectCreateSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('checkoutSchema', () => {
    it('validates pro plan checkout', () => {
      const result = safeValidateBody({ priceId: 'price_pro_monthly', planType: 'pro' }, checkoutSchema);
      expect(result.success).toBe(true);
    });

    it('validates enterprise plan checkout', () => {
      const result = safeValidateBody({ priceId: 'price_enterprise_yearly', planType: 'enterprise' }, checkoutSchema);
      expect(result.success).toBe(true);
    });

    it('rejects invalid plan type', () => {
      const result = safeValidateBody({ priceId: 'x', planType: 'free' }, checkoutSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('domainSchema', () => {
    it('validates correct domain', () => {
      const result = safeValidateBody({ domain: 'app.example.com' }, domainSchema);
      expect(result.success).toBe(true);
    });

    it('rejects empty domain', () => {
      const result = safeValidateBody({ domain: '' }, domainSchema);
      expect(result.success).toBe(false);
    });

    it('rejects domain starting with hyphen', () => {
      const result = safeValidateBody({ domain: '-example.com' }, domainSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('envVarSchema', () => {
    it('validates correct env var', () => {
      const result = safeValidateBody({ key: 'DATABASE_URL', value: 'postgres://localhost' }, envVarSchema);
      expect(result.success).toBe(true);
    });

    it('rejects lowercase key', () => {
      const result = safeValidateBody({ key: 'database_url', value: 'x' }, envVarSchema);
      expect(result.success).toBe(false);
    });

    it('rejects key starting with number', () => {
      const result = safeValidateBody({ key: '1KEY', value: 'x' }, envVarSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('integrationSchema', () => {
    it('validates github integration', () => {
      const result = safeValidateBody({ provider: 'github', config: { repo: 'owner/repo' } }, integrationSchema);
      expect(result.success).toBe(true);
    });

    it('rejects unknown provider', () => {
      const result = safeValidateBody({ provider: 'unknown' }, integrationSchema);
      expect(result.success).toBe(false);
    });
  });
});
