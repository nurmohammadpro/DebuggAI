import { describe, expect, it } from 'vitest';
import { detectIntent, pickModel, safeGroqModel, type ProviderConfigs } from '@/lib/ai/router';

describe('AI router', () => {
  it('uses the configured model for custom OpenAI-compatible providers', () => {
    const configs: ProviderConfigs = {
      zai: null,
      groq: null,
      deepseek: {
        apiKey: 'test-key',
        baseUrl: 'https://api.z.ai/api/coding/paas/v4',
        model: 'glm-4.6',
      },
    };

    const routed = pickModel('generate', configs);

    expect(routed?.model).toBe('glm-4.6');
    expect(routed?.baseUrl).toBe('https://api.z.ai/api/coding/paas/v4');
  });

  it('falls back to DeepSeek defaults when no configured model exists', () => {
    const configs: ProviderConfigs = {
      zai: null,
      groq: null,
      deepseek: {
        apiKey: 'test-key',
        baseUrl: 'https://api.deepseek.com/v1',
      },
    };

    expect(pickModel('generate', configs)?.model).toBe('deepseek-chat');
    expect(pickModel('planning', configs)?.model).toBe('deepseek-reasoner');
  });

  it('does not route Groq requests to GPT-labelled models', () => {
    expect(safeGroqModel('openai/gpt-oss-20b')).toBe('llama-3.3-70b-versatile');
    expect(safeGroqModel('gpt-4o')).toBe('llama-3.3-70b-versatile');

    const configs: ProviderConfigs = {
      zai: null,
      groq: {
        apiKey: 'test-key',
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'openai/gpt-oss-20b',
      },
      deepseek: null,
    };

    expect(pickModel('code_edit', configs)?.model).toBe('llama-3.3-70b-versatile');
  });

  it('prefers DeepSeek for code edits when both providers are configured', () => {
    const configs: ProviderConfigs = {
      zai: null,
      groq: {
        apiKey: 'groq-key',
        baseUrl: 'https://api.groq.com/openai/v1',
      },
      deepseek: {
        apiKey: 'deepseek-key',
        baseUrl: 'https://api.deepseek.com/v1',
      },
    };

    const routed = pickModel('code_edit', configs);

    expect(routed?.provider).toBe('deepseek');
    expect(routed?.model).toBe('deepseek-chat');
  });

  it('keeps Groq fallback output small enough for low TPM tiers', () => {
    const configs: ProviderConfigs = {
      zai: null,
      groq: {
        apiKey: 'groq-key',
        baseUrl: 'https://api.groq.com/openai/v1',
      },
      deepseek: null,
    };

    expect(pickModel('generate', configs)?.maxTokens).toBeLessThanOrEqual(3072);
  });

  it('uses DeepSeek before Z.ai GLM for code generation when both are configured', () => {
    const configs: ProviderConfigs = {
      zai: {
        apiKey: 'zai-key',
        baseUrl: 'https://api.z.ai/api/coding/paas/v4',
        model: 'GLM-4.6',
      },
      groq: {
        apiKey: 'groq-key',
        baseUrl: 'https://api.groq.com/openai/v1',
      },
      deepseek: {
        apiKey: 'deepseek-key',
        baseUrl: 'https://api.deepseek.com/v1',
      },
    };

    const routed = pickModel('code_edit', configs);
    const generated = pickModel('generate', configs);

    expect(routed?.provider).toBe('deepseek');
    expect(routed?.model).toBe('deepseek-chat');
    expect(routed?.baseUrl).toBe('https://api.deepseek.com/v1');
    expect(generated?.provider).toBe('deepseek');
  });

  it('routes iterative UI actions to code edits instead of planning or regeneration', () => {
    expect(detectIntent('refactor the existing app into better components')).toBe('code_edit');
    expect(detectIntent('polish the current UI and improve the cards')).toBe('code_edit');
    expect(detectIntent('redesign this page with better spacing')).toBe('code_edit');
  });
});
