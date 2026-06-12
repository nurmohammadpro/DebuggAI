import { describe, expect, it } from 'vitest';
import { pickModel, safeGroqModel, type ProviderConfigs } from '@/lib/ai/router';

describe('AI router', () => {
  it('uses the configured model for custom OpenAI-compatible providers', () => {
    const configs: ProviderConfigs = {
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
      groq: {
        apiKey: 'test-key',
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'openai/gpt-oss-20b',
      },
      deepseek: null,
    };

    expect(pickModel('code_edit', configs)?.model).toBe('llama-3.3-70b-versatile');
  });
});
