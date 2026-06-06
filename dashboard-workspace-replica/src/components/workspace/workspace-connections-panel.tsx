'use client';

import { Plug, ExternalLink } from 'lucide-react';
import { useWorkspaceStore } from '@/store/workspace-store';
import { supabase } from '@/lib/supabase';

const INTEGRATIONS = [
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect your repository for version control and deployments.',
    icon: 'https://github.com/favicon.ico',
    comingSoon: false,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy your project instantly with Vercel.',
    icon: null,
    comingSoon: false,
  },
  {
    id: 'netlify',
    name: 'Netlify',
    description: 'Deploy to Netlify with one click.',
    icon: null,
    comingSoon: false,
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Connect your own Supabase project for custom backend.',
    icon: null,
    comingSoon: true,
  },
];

export function WorkspaceConnectionsPanel() {
  const { selectedProjectId } = useWorkspaceStore();

  if (!selectedProjectId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6">
        <Plug className="h-8 w-8 text-[var(--app-text-dim)] mb-3" />
        <div className="text-[13px] font-medium text-[var(--app-text)] mb-1">Connections</div>
        <div className="text-[11px] text-[var(--app-text-muted)] max-w-[260px]">
          Open a project to manage integrations and connections.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-[var(--app-border)]">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--app-text-muted)]">
          Integrations
        </span>
      </div>

      <div className="flex-1 overflow-auto p-2 space-y-1">
        {INTEGRATIONS.map((integration) => (
          <div
            key={integration.id}
            className="flex items-center gap-3 px-3 py-3 rounded-[6px] hover:bg-[var(--app-surface)] transition-colors border border-transparent hover:border-[var(--app-border)]"
          >
            <div className="w-8 h-8 rounded-[6px] bg-[var(--app-panel-2)] flex items-center justify-center shrink-0">
              {integration.icon ? (
                <img src={integration.icon} alt="" className="w-5 h-5" />
              ) : (
                <ExternalLink className="h-4 w-4 text-[var(--app-text-dim)]" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] text-[var(--app-text)]">{integration.name}</div>
              <div className="text-[11px] text-[var(--app-text-muted)] truncate">
                {integration.description}
              </div>
            </div>
            {integration.comingSoon ? (
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] px-2 py-0.5 rounded-[6px] bg-[var(--app-surface)] text-[var(--app-text-muted)] shrink-0 border border-[var(--app-border)]">
                Soon
              </span>
            ) : (
              <button
                className="h-7 px-3 rounded-[6px] text-[11px] font-semibold uppercase tracking-tight border border-[var(--app-accent)]/30 text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10 transition-colors shrink-0"
                onClick={() => {
                  const redirectTo = `${window.location.origin}/dashboard/projects/${encodeURIComponent(selectedProjectId || '')}/settings/integrations?provider=github`;
                  supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: { scopes: 'repo,user', redirectTo },
                  });
                }}
              >
                Connect
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
