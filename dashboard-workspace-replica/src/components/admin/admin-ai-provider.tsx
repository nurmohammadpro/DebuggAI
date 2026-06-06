'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Config = {
  key: 'primary';
  enabled: boolean;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
  updatedAt: string | null;
};

export function AdminAiProvider() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);

  const [enabled, setEnabled] = useState(true);
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');

  const apiKeyPlaceholder = useMemo(() => {
    if (!config?.hasApiKey) return '';
    const last4 = config.apiKeyLast4 ? `••••${config.apiKeyLast4}` : '••••';
    return `Stored (${last4})`;
  }, [config?.apiKeyLast4, config?.hasApiKey]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ai-provider', { method: 'GET' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to load AI provider config');
      const next = j?.config as Config;
      setConfig(next);
      setEnabled(!!next.enabled);
      setBaseUrl(next.baseUrl || '');
      setModel(next.model || '');
      setApiKey('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load AI provider config');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/ai-provider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          baseUrl,
          model,
          apiKey: apiKey.trim() ? apiKey : undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || 'Failed to save AI provider config');
      setConfig(j?.config as Config);
      setApiKey('');
      toast.success('AI provider config saved');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save AI provider config');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">AI Provider</h1>
        <p className="text-sm text-[var(--app-text-muted)]">
          Configure the API key, base URL, and model used by the generator.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-medium">Enabled</div>
            <div className="text-xs text-[var(--app-text-dim)]">
              When disabled, generation falls back to environment defaults.
            </div>
          </div>
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => setEnabled((v) => !v)}
            className={`h-7 w-12 rounded-full border transition-colors ${
              enabled
                ? 'bg-[var(--app-accent)] border-[var(--app-accent)]'
                : 'bg-[var(--app-panel-2)] border-[var(--app-border)]'
            }`}
            aria-label="Toggle enabled"
          >
            <span
              className={`block h-5 w-5 bg-white rounded-full transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ai-base-url">Base URL</Label>
            <Input
              id="ai-base-url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              disabled={loading || saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-model">Model</Label>
            <Input
              id="ai-model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4.1-mini"
              disabled={loading || saving}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-api-key">API Key</Label>
          <Input
            id="ai-api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={apiKeyPlaceholder || 'Paste a new key to update'}
            disabled={loading || saving}
          />
          <div className="text-xs text-[var(--app-text-dim)]">
            Leave blank to keep the existing key.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={save} disabled={loading || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button variant="secondary" onClick={load} disabled={loading || saving}>
            Refresh
          </Button>
        </div>
      </Card>
    </div>
  );
}

