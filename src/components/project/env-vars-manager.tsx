/**
 * Environment Variables Manager
 * Enterprise-grade environment variable management similar to v0.dev
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Eye, EyeOff, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnvVar {
  id: string;
  key: string;
  value: string;
  is_secret: boolean;
  description?: string;
  created_at: string;
  updated_at: string;
}

interface EnvVarsManagerProps {
  projectId: string;
}

export function EnvVarsManager({ projectId }: EnvVarsManagerProps) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [editingVar, setEditingVar] = useState<EnvVar | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchEnvVars();
  }, [projectId]);

  const fetchEnvVars = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/env-vars`);
      if (!response.ok) throw new Error('Failed to fetch environment variables');
      const data = await response.json();
      setEnvVars(data);
    } catch (error) {
      console.error('Error fetching environment variables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: Omit<EnvVar, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/env-vars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create environment variable');
      await fetchEnvVars();
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating environment variable:', error);
    }
  };

  const handleUpdate = async (id: string, data: Partial<EnvVar>) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/env-vars`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      if (!response.ok) throw new Error('Failed to update environment variable');
      await fetchEnvVars();
      setEditingVar(null);
    } catch (error) {
      console.error('Error updating environment variable:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this environment variable?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/env-vars?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete environment variable');
      await fetchEnvVars();
    } catch (error) {
      console.error('Error deleting environment variable:', error);
    }
  };

  const filteredVars = envVars.filter(envVar =>
    envVar.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    envVar.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Environment Variables</h3>
          <p className="text-sm text-muted-foreground">
            Manage runtime configuration and secrets
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Variable
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search variables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Create Form */}
      {isCreating && (
        <EnvVarForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Environment Variables List */}
      <div className="border rounded-lg divide-y">
        {filteredVars.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No environment variables found. Add your first variable to get started.
          </div>
        ) : (
          filteredVars.map((envVar) => (
            <div
              key={envVar.id}
              className={cn(
                "p-4 hover:bg-accent/50 transition-colors",
                editingVar?.id === envVar.id && "bg-accent"
              )}
            >
              {editingVar?.id === envVar.id ? (
                <EnvVarForm
                  envVar={editingVar}
                  onSubmit={(data) => handleUpdate(envVar.id, data)}
                  onCancel={() => setEditingVar(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-medium font-mono">
                        {envVar.key}
                      </code>
                      {envVar.is_secret && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
                          Secret
                        </span>
                      )}
                    </div>
                    {envVar.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {envVar.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowSecrets(prev => ({
                        ...prev,
                        [envVar.id]: !prev[envVar.id]
                      }))}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                      title={showSecrets[envVar.id] ? 'Hide value' : 'Show value'}
                    >
                      {showSecrets[envVar.id] ? (
                        <EyeOff className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingVar(envVar)}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                      title="Edit variable"
                    >
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(envVar.id)}
                      className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                      title="Delete variable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Environment variables</strong> are available at runtime. Secret variables are masked in the UI and never logged.
          Changes take effect on the next deployment.
        </p>
      </div>
    </div>
  );
}

interface EnvVarFormProps {
  envVar?: EnvVar;
  onSubmit: (data: Omit<EnvVar, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
}

function EnvVarForm({ envVar, onSubmit, onCancel }: EnvVarFormProps) {
  const [key, setKey] = useState(envVar?.key || '');
  const [value, setValue] = useState(envVar?.value || '');
  const [isSecret, setIsSecret] = useState(envVar?.is_secret ?? true);
  const [description, setDescription] = useState(envVar?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ key, value, is_secret: isSecret, description });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg bg-accent/30">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Key</label>
          <input
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="VARIABLE_NAME"
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Value</label>
          <input
            type={isSecret ? 'password' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="variable-value"
            className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What this variable is used for"
          className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is-secret"
          checked={isSecret}
          onChange={(e) => setIsSecret(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="is-secret" className="text-sm">
          This is a secret (will be masked in the UI)
        </label>
      </div>

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg border hover:bg-accent transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {envVar ? 'Update' : 'Create'} Variable
        </button>
      </div>
    </form>
  );
}
