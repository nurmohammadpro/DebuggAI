/**
 * Integrations Manager
 * Enterprise-grade third-party service integrations similar to v0.dev
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, ExternalLink, CheckCircle2, Lock, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface Integration {
  id: string;
  integration_type: string;
  config: Record<string, any>;
  enabled: boolean;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

interface IntegrationConfig {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  category: 'deployment' | 'git' | 'analytics' | 'communication' | 'database';
  fields: IntegrationField[];
  docsUrl?: string;
}

interface IntegrationField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'boolean';
  placeholder: string;
  required: boolean;
  description?: string;
}

interface IntegrationsManagerProps {
  projectId: string;
}

const AVAILABLE_INTEGRATIONS: IntegrationConfig[] = [
  {
    id: 'vercel',
    type: 'vercel',
    name: 'Vercel',
    description: 'Deploy your projects to Vercel with automatic preview deployments',
    icon: '▲',
    category: 'deployment',
    fields: [
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'password',
        placeholder: 'your_vercel_token',
        required: true,
        description: 'Create a token in your Vercel account settings',
      },
      {
        key: 'projectId',
        label: 'Project ID',
        type: 'text',
        placeholder: 'prj_...',
        required: false,
      },
    ],
    docsUrl: 'https://vercel.com/docs',
  },
  {
    id: 'netlify',
    type: 'netlify',
    name: 'Netlify',
    description: 'Deploy your projects to Netlify with continuous deployment',
    icon: 'N',
    category: 'deployment',
    fields: [
      {
        key: 'accessToken',
        label: 'Personal Access Token',
        type: 'password',
        placeholder: 'your_netlify_token',
        required: true,
        description: 'Create a token in your Netlify user settings',
      },
      {
        key: 'siteId',
        label: 'Site ID',
        type: 'text',
        placeholder: 'your-site-id',
        required: false,
      },
    ],
    docsUrl: 'https://docs.netlify.com/',
  },
  {
    id: 'github',
    type: 'github',
    name: 'GitHub',
    description: 'Connect to GitHub repositories for version control and collaboration',
    icon: '⌥',
    category: 'git',
    fields: [
      {
        key: 'accessToken',
        label: 'Personal Access Token',
        type: 'password',
        placeholder: 'ghp_...',
        required: true,
        description: 'Create a token with repo permissions',
      },
      {
        key: 'repository',
        label: 'Repository',
        type: 'text',
        placeholder: 'owner/repo',
        required: false,
      },
    ],
    docsUrl: 'https://docs.github.com/',
  },
  {
    id: 'stripe',
    type: 'stripe',
    name: 'Stripe',
    description: 'Accept payments and manage subscriptions with Stripe',
    icon: 'S',
    category: 'communication',
    fields: [
      {
        key: 'publishableKey',
        label: 'Publishable Key',
        type: 'text',
        placeholder: 'pk_...',
        required: true,
      },
      {
        key: 'secretKey',
        label: 'Secret Key',
        type: 'password',
        placeholder: 'sk_...',
        required: true,
      },
    ],
    docsUrl: 'https://stripe.com/docs',
  },
  {
    id: 'supabase',
    type: 'supabase',
    name: 'Supabase',
    description: 'Connect to Supabase for database and authentication',
    icon: 'zap',
    category: 'database',
    fields: [
      {
        key: 'url',
        label: 'Project URL',
        type: 'url',
        placeholder: 'https://your-project.supabase.co',
        required: true,
      },
      {
        key: 'anonKey',
        label: 'Anon Key',
        type: 'password',
        placeholder: 'your-anon-key',
        required: true,
      },
    ],
    docsUrl: 'https://supabase.com/docs',
  },
];

export function IntegrationsManager({ projectId }: IntegrationsManagerProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchIntegrations();
  }, [projectId]);

  const fetchIntegrations = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/integrations`);
      if (!response.ok) throw new Error('Failed to fetch integrations');
      const data = await response.json();
      setIntegrations(data);
    } catch (error) {
      console.error('Error fetching integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (type: string, config: Record<string, any>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integration_type: type, config }),
      });
      if (!response.ok) throw new Error('Failed to create integration');
      await fetchIntegrations();
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating integration:', error);
      throw error;
    }
  };

  const handleUpdate = async (id: string, config: Record<string, any>, enabled: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/integrations`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, config, enabled }),
      });
      if (!response.ok) throw new Error('Failed to update integration');
      await fetchIntegrations();
      setEditingIntegration(null);
    } catch (error) {
      console.error('Error updating integration:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this integration?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/integrations?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete integration');
      await fetchIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
    }
  };

  const handleGitHubOAuth = async () => {
    const redirectTo = `${window.location.origin}/dashboard/projects/${encodeURIComponent(projectId)}/settings/integrations`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { scopes: 'repo,user', redirectTo },
    });
    if (error) console.error('GitHub OAuth error:', error);
  };

  const categories = ['all', ...Array.from(new Set(AVAILABLE_INTEGRATIONS.map(i => i.category)))];
  const filteredIntegrations = AVAILABLE_INTEGRATIONS.filter(
    i => selectedCategory === 'all' || i.category === selectedCategory
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Integrations</h3>
          <p className="text-sm text-muted-foreground">
            Connect third-party services to enhance your project
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-[8px] hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-[8px] transition-colors capitalize',
              selectedCategory === category
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Active Integrations */}
      {integrations.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Active Integrations
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            {integrations.map((integration) => {
              const config = AVAILABLE_INTEGRATIONS.find(
                i => i.type === integration.integration_type
              );
              if (!config) return null;

              return (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  config={config}
                  onEdit={() => setEditingIntegration(integration)}
                  onDelete={() => handleDelete(integration.id)}
                  onToggle={(enabled) =>
                    handleUpdate(integration.id, integration.config, enabled)
                  }
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Available Integrations
        </h4>
        <div className="grid gap-4 md:grid-cols-2">
          {filteredIntegrations
            .filter(i => !integrations.some(int => int.integration_type === i.type))
            .map((integration) => (
              <IntegrationConfigCard
                key={integration.id}
                config={integration}
                onAdd={() => setIsCreating(true)}
              />
            ))}
        </div>
      </div>

      {/* Integration Modals */}
      {isCreating && (
        <IntegrationFormModal
          availableIntegrations={AVAILABLE_INTEGRATIONS}
          existingIntegrations={integrations}
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {editingIntegration && (
        <IntegrationFormModal
          availableIntegrations={AVAILABLE_INTEGRATIONS}
          existingIntegrations={integrations}
          integration={editingIntegration}
          onSubmit={(type, config) =>
            handleUpdate(editingIntegration.id, config, editingIntegration.enabled)
          }
          onCancel={() => setEditingIntegration(null)}
        />
      )}
    </div>
  );
}

interface IntegrationCardProps {
  integration: Integration;
  config: IntegrationConfig;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (enabled: boolean) => void;
}

function IntegrationCard({
  integration,
  config,
  onEdit,
  onDelete,
  onToggle,
}: IntegrationCardProps) {
  return (
    <div className="p-4 border rounded-[8px] bg-card">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-primary/10 flex items-center justify-center text-lg">
            {config.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">{config.name}</h4>
              {integration.enabled && (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            {integration.last_synced_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Last synced: {new Date(integration.last_synced_at).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(!integration.enabled)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-[8px] transition-colors',
              integration.enabled
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
            )}
          >
            {integration.enabled ? 'Enabled' : 'Disabled'}
          </button>
          <button
            onClick={onEdit}
            className="p-2 hover:bg-accent rounded-[8px] transition-colors"
          >
            <Lock className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-[8px] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface IntegrationConfigCardProps {
  config: IntegrationConfig;
  onAdd: () => void;
}

function IntegrationConfigCard({ config, onAdd }: IntegrationConfigCardProps) {
  const isGitHub = config.type === 'github';

  const handleGitHubConnect = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { scopes: 'repo,user', redirectTo: window.location.href },
    });
    if (error) console.error('GitHub OAuth error:', error);
  };

  return (
    <div className="p-4 border rounded-[8px] hover:bg-accent/50 transition-colors group">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[8px] bg-primary/10 flex items-center justify-center text-lg">
            {config.icon}
          </div>
          <div className="flex-1">
            <h4 className="font-medium">{config.name}</h4>
            <p className="text-sm text-muted-foreground mt-1">{config.description}</p>
            {isGitHub && (
              <p className="text-xs text-[var(--app-accent)] mt-1.5 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                OAuth available — one-click connect
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isGitHub ? (
            <>
              <button
                onClick={handleGitHubConnect}
                className="px-3 py-1.5 text-sm rounded-[8px] bg-[var(--app-accent)] text-[var(--app-bg)] hover:opacity-90 transition-colors font-medium"
              >
                Connect GitHub
              </button>
              <button
                onClick={onAdd}
                className="px-3 py-1.5 text-sm rounded-[8px] border hover:bg-accent transition-colors"
                title="Manual token setup"
              >
                Manual
              </button>
            </>
          ) : (
            <button
              onClick={onAdd}
              className="px-3 py-1.5 text-sm rounded-[8px] border hover:bg-accent transition-colors"
            >
              Add
            </button>
          )}
          {config.docsUrl && (
            <a
              href={config.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-accent rounded-[8px] transition-colors"
            >
              <ExternalLink className="w-4 w-4 text-muted-foreground" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

interface IntegrationFormModalProps {
  availableIntegrations: IntegrationConfig[];
  existingIntegrations: Integration[];
  integration?: Integration;
  onSubmit: (type: string, config: Record<string, any>) => void;
  onCancel: () => void;
}

function IntegrationFormModal({
  availableIntegrations,
  existingIntegrations,
  integration,
  onSubmit,
  onCancel,
}: IntegrationFormModalProps) {
  const [selectedType, setSelectedType] = useState(integration?.integration_type || '');
  const [config, setConfig] = useState<Record<string, any>>(integration?.config || {});

  const selectedConfig = availableIntegrations.find(i => i.type === selectedType);
  const isEditing = !!integration;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedType, config);
  };

  const availableConfigs = availableIntegrations.filter(
    i => !existingIntegrations.some(int => int.integration_type === i.type) || i.type === selectedType
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-[8px] max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold">
              {isEditing ? 'Edit Integration' : 'Add Integration'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isEditing
                ? 'Update your integration configuration'
                : 'Connect a third-party service to your project'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isEditing && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Service</label>
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setConfig({});
                  }}
                  className="w-full px-3 py-2 border rounded-[8px] bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                >
                  <option value="">Select a service...</option>
                  {availableConfigs.map((i) => (
                    <option key={i.id} value={i.type}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedConfig && (
              <div className="space-y-4">
                {selectedConfig.docsUrl && (
                  <a
                    href={selectedConfig.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View {selectedConfig.name} documentation
                  </a>
                )}

                {selectedConfig.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium">{field.label}</label>
                    <input
                      type={field.type}
                      value={config[field.key] || ''}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, [field.key]: e.target.value }))
                      }
                      placeholder={field.placeholder}
                      required={field.required}
                      className="w-full px-3 py-2 border rounded-[8px] bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {field.description && (
                      <p className="text-xs text-muted-foreground">{field.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 justify-end pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-sm rounded-[8px] border hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedType}
                className="px-4 py-2 text-sm rounded-[8px] bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditing ? 'Update' : 'Add'} Integration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
