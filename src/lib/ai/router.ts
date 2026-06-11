/**
 * AI Provider Router
 *
 * Routes requests to the appropriate model based on intent:
 * - Code edits, simple generation → Groq Llama (fast, cheap)
 * - Complex planning, architecture → DeepSeek (reasoning)
 * - Fallback: if Groq fails, retry with DeepSeek
 */

export type ModelIntent = 'code_edit' | 'planning' | 'generate' | 'debug';

export interface RoutedModel {
  provider: 'groq' | 'deepseek';
  model: string;
  baseUrl: string;
  apiKey: string;
  maxTokens: number;
}

export interface ProviderConfigs {
  groq: { apiKey: string; baseUrl: string } | null;
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

function configuredDeepseekModel(
  configs: ProviderConfigs,
  fallback: string,
) {
  return configs.deepseek?.model?.trim() || fallback;
}

export function pickModel(intent: ModelIntent, configs: ProviderConfigs): RoutedModel | null {
  // Helper to build Groq config
  const groq = (model: string, tokens: number): RoutedModel | null => {
    if (!configs.groq) return null;
    return {
      provider: 'groq',
      model,
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
    // Code edits are frequent/tiny → Groq fastest path
    case 'code_edit':
      return groq(GROQ_MODELS.fast, 4096) ?? deepseek(DEEPSEEK_MODELS.chat, 4096);

    // Planning needs reasoning → DeepSeek, fall back to Groq
    case 'planning':
      return deepseek(DEEPSEEK_MODELS.reasoner, 16384) ?? groq(GROQ_MODELS.fast, 8192);

    // Full generation → DeepSeek preferred, Groq fallback
    case 'generate':
      return deepseek(DEEPSEEK_MODELS.chat, 16384) ?? groq(GROQ_MODELS.fast, 8192);

    // Debugging → DeepSeek (good at analysis)
    case 'debug':
      return deepseek(DEEPSEEK_MODELS.chat, 8192) ?? groq(GROQ_MODELS.fast, 4096);

    default:
      return groq(GROQ_MODELS.fast, 4096) ?? deepseek(DEEPSEEK_MODELS.chat, 4096);
  }
}

/**
 * Detect intent from user prompt text.
 * Simple heuristic — can be upgraded to classifier.
 */
export function detectIntent(prompt: string): ModelIntent {
  const lower = prompt.toLowerCase();

  // Planning keywords
  if (/plan|architect|design (the|a) system|how should i|best practice|refactor|restructure/i.test(lower)) {
    return 'planning';
  }

  // Code edit keywords
  if (/change|fix|update|replace|edit|modify|add (a|the) |remove|delete|rename|move /i.test(lower)) {
    return 'code_edit';
  }

  // Debug keywords
  if (/debug|error|bug|crash|failing|broken|not working|wrong|issue/i.test(lower)) {
    return 'debug';
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
