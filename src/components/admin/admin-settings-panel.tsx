'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getAdminAuthHeaders } from '@/hooks/queries/use-admin-auth';

interface ThrottleConfig {
  key: string;
  value: string;
  category: string;
}

export function AdminSettingsPanel() {
  const [configs, setConfigs] = useState<ThrottleConfig[]>([]);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/throttles');
      if (!res.ok) throw new Error('Failed to fetch configs');
      const data = await res.json();
      setConfigs(data.configs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      const headers = await getAdminAuthHeaders();
      const res = await fetch('/api/admin/throttles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(edits),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSaved(true);
      setEdits({});
      await fetchConfigs();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const byCategory = configs.reduce<Record<string, ThrottleConfig[]>>((acc, c) => {
    (acc[c.category] ||= []).push(c);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    rate_limit: 'Rate Limits',
    ai: 'AI Model Config',
    security: 'Security',
    integrations: 'Integrations',
    jobs: 'Job Settings',
    general: 'General',
  };

  const getValue = (key: string) => key in edits ? edits[key] : configs.find((c) => c.key === key)?.value || '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--app-text-dim)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-[var(--app-accent)]" />
          <h2 className="text-[16px] font-medium text-[var(--app-text)]">Platform Settings</h2>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-[13px] text-[var(--app-success)] flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          {error && (
            <span className="text-[13px] text-[var(--app-danger)] flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving || Object.keys(edits).length === 0}
            className="h-9 px-4 rounded-[6px] inline-flex items-center gap-2 bg-[var(--app-accent)] text-[var(--app-bg)] text-[13px] font-medium disabled:opacity-50 hover:opacity-90 transition-colors"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      </div>

      {Object.entries(byCategory).map(([category, items]) => (
        <div key={category}>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-dim)] mb-2 px-1">
            {categoryLabels[category] || category}
          </h3>
          <div className="rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel)] overflow-hidden">
            {items.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between px-4 py-3 border-b border-[var(--app-border)]/50 last:border-0 hover:bg-[var(--app-surface)] transition-colors"
              >
                <div>
                  <label className="text-[13px] font-medium text-[var(--app-text)] capitalize">
                    {item.key.replace(/_/g, ' ')}
                  </label>
                  <p className="text-[11px] text-[var(--app-text-dim)]">{item.key}</p>
                </div>
                <div>
                  <input
                    type="text"
                    value={getValue(item.key)}
                    onChange={(e) => setEdits((prev) => ({ ...prev, [item.key]: e.target.value }))}
                    className="w-48 h-8 rounded-[6px] border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 text-[13px] font-mono text-[var(--app-text)] outline-none focus:border-[var(--app-accent)] text-right"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {configs.length === 0 && (
        <div className="text-center py-8 text-[13px] text-[var(--app-text-muted)]">
          No throttle config found. The throttle_config table may not be seeded yet — run the migration first.
        </div>
      )}
    </div>
  );
}
