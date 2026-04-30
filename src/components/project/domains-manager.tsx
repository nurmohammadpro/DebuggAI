/**
 * Custom Domains Manager
 * Enterprise-grade custom domain management with SSL support similar to v0.dev
 */

'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, XCircle, Clock, Globe, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Domain {
  id: string;
  domain: string;
  ssl_enabled: boolean;
  ssl_expires_at?: string;
  primary_domain: boolean;
  verified_at?: string;
  verification_token?: string;
  created_at: string;
}

interface DomainsManagerProps {
  projectId: string;
}

export function DomainsManager({ projectId }: DomainsManagerProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);

  useEffect(() => {
    fetchDomains();
  }, [projectId]);

  const fetchDomains = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/domains`);
      if (!response.ok) throw new Error('Failed to fetch domains');
      const data = await response.json();
      setDomains(data);
    } catch (error) {
      console.error('Error fetching domains:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (domain: string, isPrimary: boolean) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, primary_domain: isPrimary }),
      });
      if (!response.ok) throw new Error('Failed to create domain');
      await fetchDomains();
      setIsCreating(false);
    } catch (error) {
      console.error('Error creating domain:', error);
      throw error;
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/domains`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, primary_domain: true }),
      });
      if (!response.ok) throw new Error('Failed to set primary domain');
      await fetchDomains();
    } catch (error) {
      console.error('Error setting primary domain:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/domains?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete domain');
      await fetchDomains();
    } catch (error) {
      console.error('Error deleting domain:', error);
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingDomain(id);
    try {
      const response = await fetch(`/api/projects/${projectId}/domains/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) throw new Error('Failed to verify domain');
      await fetchDomains();
    } catch (error) {
      console.error('Error verifying domain:', error);
    } finally {
      setVerifyingDomain(null);
    }
  };

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
          <h3 className="text-lg font-semibold">Custom Domains</h3>
          <p className="text-sm text-muted-foreground">
            Add custom domains and configure SSL certificates
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Domain
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <DomainForm
          onSubmit={handleCreate}
          onCancel={() => setIsCreating(false)}
          existingDomains={domains}
        />
      )}

      {/* Domains List */}
      <div className="space-y-4">
        {domains.length === 0 ? (
          <div className="p-8 text-center border rounded-lg text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No custom domains configured</p>
            <p className="text-sm mt-2">Add a custom domain to give your project a professional URL</p>
          </div>
        ) : (
          domains.map((domain) => (
            <DomainCard
              key={domain.id}
              domain={domain}
              onSetPrimary={() => handleSetPrimary(domain.id)}
              onDelete={() => handleDelete(domain.id)}
              onVerify={() => handleVerify(domain.id)}
              isVerifying={verifyingDomain === domain.id}
            />
          ))
        )}
      </div>

      {/* DNS Instructions */}
      {domains.some(d => !d.verified_at) && (
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">DNS Configuration</h4>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
            To verify your domain, add the following DNS records:
          </p>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-3 gap-2 p-2 bg-blue-100 dark:bg-blue-900/20 rounded">
              <span className="font-medium">Type</span>
              <span className="font-medium">Name</span>
              <span className="font-medium">Value</span>
            </div>
            <div className="grid grid-cols-3 gap-2 p-2 bg-background rounded">
              <span className="font-mono">CNAME</span>
              <span className="font-mono">your-domain</span>
              <span className="font-mono text-xs">your-app.vercel.app</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DomainCardProps {
  domain: Domain;
  onSetPrimary: () => void;
  onDelete: () => void;
  onVerify: () => void;
  isVerifying: boolean;
}

function DomainCard({ domain, onSetPrimary, onDelete, onVerify, isVerifying }: DomainCardProps) {
  const status = domain.verified_at ? 'verified' : 'pending';

  return (
    <div className="p-4 border rounded-lg bg-card">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h4 className="font-medium font-mono">{domain.domain}</h4>
            {domain.primary_domain && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                Primary
              </span>
            )}
            <DomainStatus status={status} />
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" />
              <span>SSL: {domain.ssl_enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            {domain.ssl_expires_at && (
              <span>Expires: {new Date(domain.ssl_expires_at).toLocaleDateString()}</span>
            )}
          </div>

          {!domain.verified_at && (
            <div className="mt-3 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                <strong>Pending verification</strong> - Add the DNS records below to verify ownership
              </p>
              <button
                onClick={onVerify}
                disabled={isVerifying}
                className="mt-2 px-3 py-1 text-sm rounded bg-yellow-100 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 hover:bg-yellow-200 dark:hover:bg-yellow-900/30 disabled:opacity-50 transition-colors"
              >
                {isVerifying ? 'Verifying...' : 'Verify Domain'}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!domain.primary_domain && (
            <button
              onClick={onSetPrimary}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-accent transition-colors"
            >
              Set Primary
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
            title="Delete domain"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function DomainStatus({ status }: { status: 'verified' | 'pending' }) {
  if (status === 'verified') {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
        <CheckCircle className="w-3 h-3" />
        Verified
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">
      <Clock className="w-3 h-3" />
      Pending
    </span>
  );
}

interface DomainFormProps {
  onSubmit: (domain: string, isPrimary: boolean) => void;
  onCancel: () => void;
  existingDomains: Domain[];
}

function DomainForm({ onSubmit, onCancel, existingDomains }: DomainFormProps) {
  const [domain, setDomain] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (!domain) {
      setError('Domain is required');
      return;
    }

    // Check for duplicate
    if (existingDomains.some(d => d.domain === domain)) {
      setError('This domain is already added');
      return;
    }

    onSubmit(domain, isPrimary);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-accent/30 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Domain</label>
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="your-domain.com"
          className="w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono"
          required
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is-primary"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="is-primary" className="text-sm">
          Set as primary domain
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
          Add Domain
        </button>
      </div>
    </form>
  );
}
