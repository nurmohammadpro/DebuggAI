import 'server-only';

import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export type AiProviderConfigPublic = {
  key: 'primary';
  enabled: boolean;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
  updatedAt: string | null;
};

export type AiProviderConfigSecret = {
  key: 'primary';
  enabled: boolean;
  baseUrl: string;
  model: string;
  apiKey: string | null;
};

export async function getAiProviderConfigSecret(): Promise<AiProviderConfigSecret | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('ai_provider_config')
    .select('key, enabled, base_url, model, api_key')
    .eq('key', 'primary')
    .maybeSingle();

  if (error || !data) return null;

  return {
    key: 'primary',
    enabled: !!data.enabled,
    baseUrl: String(data.base_url || '').trim(),
    model: String(data.model || '').trim(),
    apiKey: typeof data.api_key === 'string' ? data.api_key : null,
  };
}

export async function getAiProviderConfigPublic(): Promise<AiProviderConfigPublic | null> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from('ai_provider_config')
    .select('key, enabled, base_url, model, api_key_last4, updated_at')
    .eq('key', 'primary')
    .maybeSingle();

  if (error || !data) return null;

  const last4 = typeof data.api_key_last4 === 'string' ? data.api_key_last4 : null;

  return {
    key: 'primary',
    enabled: !!data.enabled,
    baseUrl: String(data.base_url || '').trim(),
    model: String(data.model || '').trim(),
    hasApiKey: !!last4,
    apiKeyLast4: last4,
    updatedAt: typeof data.updated_at === 'string' ? data.updated_at : null,
  };
}

export async function upsertAiProviderConfig(input: {
  enabled: boolean;
  baseUrl: string;
  model: string;
  apiKey?: string | null;
}) {
  const supabase = createSupabaseAdmin();

  const baseUrl = input.baseUrl.trim();
  const model = input.model.trim();

  if (!baseUrl) throw new Error('baseUrl is required');
  if (!model) throw new Error('model is required');

  const apiKey =
    input.apiKey === undefined
      ? undefined
      : (input.apiKey || '').trim() || null;
  const apiKeyLast4 =
    apiKey && apiKey.length >= 4 ? apiKey.slice(-4) : apiKey ? apiKey : null;

  const patch: Record<string, unknown> = {
    key: 'primary',
    enabled: input.enabled,
    base_url: baseUrl,
    model,
    updated_at: new Date().toISOString(),
  };

  if (apiKey !== undefined) {
    patch.api_key = apiKey;
    patch.api_key_last4 = apiKeyLast4;
  }

  const { error } = await supabase
    .from('ai_provider_config')
    .upsert(patch, { onConflict: 'key' });

  if (error) throw new Error(error.message);

  return true;
}

