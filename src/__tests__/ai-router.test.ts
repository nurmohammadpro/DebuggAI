import { describe, expect, it } from 'vitest';
import { pickModel, type ProviderConfigs } from '@/lib/ai/router';

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
});
