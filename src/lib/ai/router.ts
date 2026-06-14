/**
 * AI Provider Router
 *
 * Routes requests to the appropriate model based on intent:
 * - DeepSeek first for builder edits/generation (larger practical budget)
 * - Groq fallback with conservative output tokens for free-tier TPM limits
 */

export type ModelIntent = 'code_edit' | 'planning' | 'generate' | 'debug';

export interface RoutedModel {
  provider: 'groq' | 'deepseek' | 'zai';
  model: string;
  baseUrl: string;
  apiKey: string;
  maxTokens: number;
}

export interface ProviderConfigs {
  zai: { apiKey: string; baseUrl: string; model?: string | null } | null;
  groq: { apiKey: string; baseUrl: string; model?: string | null } | null;
  deepseek: { apiKey: string; baseUrl: string; model?: string | null } | null;
}

const DEEPSEEK_MODELS = {
  chat: 'deepseek-chat',
  reasoner: 'deepseek-reasoner',
} as const;

const GROQ_MODELS = {
  fast: 'llama-3.3-70b-versatile',
  large: 'llama-3.1-8b-instant',
} as const;

const DISALLOWED_GROQ_MODELS = [/^openai\/gpt-oss/i, /^gpt-/i];
const ZAI_DEFAULT_MODEL = 'GLM-4.6';
const ZAI_DEFAULT_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';

function configuredDeepseekModel(
  configs: ProviderConfigs,
  fallback: string,
) {
  return configs.deepseek?.model?.trim() || fallback;
}

export function safeGroqModel(model: string | null | undefined) {
  const configured = model?.trim();
  if (!configured) return GROQ_MODELS.fast;
  if (DISALLOWED_GROQ_MODELS.some((pattern) => pattern.test(configured))) {
    return GROQ_MODELS.fast;
  }
  return configured;
}

function configuredZaiModel(configs: ProviderConfigs) {
  return configs.zai?.model?.trim() || ZAI_DEFAULT_MODEL;
}

export function pickModel(intent: ModelIntent, configs: ProviderConfigs): RoutedModel | null {
  const zai = (tokens: number): RoutedModel | null => {
    if (!configs.zai) return null;
    return {
      provider: 'zai',
      model: configuredZaiModel(configs),
      baseUrl: configs.zai.baseUrl || ZAI_DEFAULT_BASE_URL,
      apiKey: configs.zai.apiKey,
      maxTokens: tokens,
    };
  };

  // Helper to build Groq config
  const groq = (model: string, tokens: number): RoutedModel | null => {
    if (!configs.groq) return null;
    return {
      provider: 'groq',
      model: safeGroqModel(configs.groq.model || model),
      baseUrl: configs.groq.baseUrl,
      apiKey: configs.groq.apiKey,
      maxTokens: tokens,
    };
  };

  const deepseek = (model: string, tokens: number): RoutedModel | null => {
    if (!configs.deepseek) return null;
    return {
      provider: 'deepseek',
      model: configuredDeepseekModel(configs, model),
      baseUrl: configs.deepseek.baseUrl,
      apiKey: configs.deepseek.apiKey,
      maxTokens: tokens,
    };
  };

  switch (intent) {
    // Builder edits need reliable file output; prefer DeepSeek.
    case 'code_edit':
      return zai(8192) ?? deepseek(DEEPSEEK_MODELS.chat, 8192) ?? groq(GROQ_MODELS.fast, 3072);

    // Planning needs reasoning → DeepSeek, fall back to Groq
    case 'planning':
      return zai(16384) ?? deepseek(DEEPSEEK_MODELS.reasoner, 16384) ?? groq(GROQ_MODELS.fast, 3072);

    // Full generation → DeepSeek preferred, Groq fallback
    case 'generate':
      return zai(16384) ?? deepseek(DEEPSEEK_MODELS.chat, 16384) ?? groq(GROQ_MODELS.fast, 3072);

    // Debugging → DeepSeek (good at analysis)
    case 'debug':
      return zai(8192) ?? deepseek(DEEPSEEK_MODELS.chat, 8192) ?? groq(GROQ_MODELS.fast, 3072);

    default:
      return zai(8192) ?? deepseek(DEEPSEEK_MODELS.chat, 8192) ?? groq(GROQ_MODELS.fast, 3072);
  }
}

/**
 * Detect intent from user prompt text.
 * Simple heuristic — can be upgraded to classifier.
 */
export function detectIntent(prompt: string): ModelIntent {
  const lower = prompt.toLowerCase();

  // Existing-app edit keywords. These must route to the tool-edit agent, not
  // planning, otherwise Refactor/Polish buttons produce advice or full
  // regeneration instead of modifying the current files.
  if (/refactor|restructure|polish|redesign|improve|enhance|clean up|cleanup|make .*better|change|fix|update|replace|edit|modify|add (a|the) |remove|delete|rename|move /i.test(lower)) {
    return 'code_edit';
  }

  // Debug keywords
  if (/debug|error|bug|crash|failing|broken|not working|wrong|issue/i.test(lower)) {
    return 'debug';
  }

  // Planning keywords
  if (/plan|architect|design (the|a) system|how should i|best practice/i.test(lower)) {
    return 'planning';
  }

  // Default: full generation
  return 'generate';
}

/**
 * Call AI with retry + fallback.
 * Attempts the primary model first; on failure, tries fallback.
 */
export async function callAIModel(
  model: RoutedModel,
  messages: Array<{ role: string; content: string }>,
  tools?: Array<unknown>,
  fallbackModel?: RoutedModel,
): Promise<Response> {
  const doCall = async (m: RoutedModel): Promise<Response> => {
    const body: Record<string, unknown> = {
      model: m.model,
      messages,
      stream: true,
      max_tokens: m.maxTokens,
      temperature: m.provider === 'deepseek' && m.model.includes('reasoner') ? 0.3 : 0.7,
    };
    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = 'auto';
    }

    const res = await fetch(`${m.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${m.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });

    return res;
  };

  const primary = await doCall(model);
  if (primary.ok) return primary;

  // Try fallback if available
  if (fallbackModel) {
    console.warn(`[ai/router] Primary ${model.provider}/${model.model} failed, trying fallback ${fallbackModel.provider}/${fallbackModel.model}`);
    return doCall(fallbackModel);
  }

  return primary;
}
