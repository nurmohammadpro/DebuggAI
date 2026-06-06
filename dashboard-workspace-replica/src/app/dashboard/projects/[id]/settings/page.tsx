/**
 * Project Settings Page
 * Main project settings page with general configuration options
 */

import { SettingsNav } from '@/components/project/settings-nav';

interface ProjectSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { id: projectId } = await params;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      <SettingsNav projectId={projectId} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <div className="mb-8">
            <h1 className="text-[16px] font-medium tracking-[-0.02em] text-[var(--app-text)]">
              General Settings
            </h1>
            <p className="text-[13px] text-[var(--app-text-muted)] mt-2">
              Manage your project configuration and preferences
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-[13px] font-medium mb-4 text-[var(--app-text)]">
              Project Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[var(--app-text-muted)]">
                  Project Name
                </label>
                <input
                  type="text"
                  className="w-full max-w-md px-3 py-2 border border-[var(--app-border)] rounded-[8px] bg-[var(--app-panel)] text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] focus:outline-none focus:border-[var(--app-accent)] transition-colors"
                  placeholder="My Project"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[var(--app-text-muted)]">
                  Description
                </label>
                <textarea
                  className="w-full max-w-md px-3 py-2 border border-[var(--app-border)] rounded-[8px] bg-[var(--app-panel)] text-[13px] text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] focus:outline-none focus:border-[var(--app-accent)] transition-colors resize-none"
                  rows={3}
                  placeholder="Describe your project..."
                />
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-[13px] font-medium mb-4 text-[var(--app-text)]">
              Framework & Runtime
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[var(--app-text-muted)]">
                  Framework
                </label>
                <select className="w-full max-w-md px-3 py-2 border border-[var(--app-border)] rounded-[8px] bg-[var(--app-panel)] text-[13px] text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)] transition-colors">
                  <option value="nextjs">Next.js</option>
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="svelte">Svelte</option>
                  <option value="nuxt">Nuxt</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[var(--app-text-muted)]">
                  Node Version
                </label>
                <select className="w-full max-w-md px-3 py-2 border border-[var(--app-border)] rounded-[8px] bg-[var(--app-panel)] text-[13px] text-[var(--app-text)] focus:outline-none focus:border-[var(--app-accent)] transition-colors">
                  <option value="20">20.x</option>
                  <option value="18">18.x</option>
                  <option value="16">16.x</option>
                </select>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-[13px] font-medium mb-4 text-[var(--app-text)]">
              Build Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[var(--app-text-muted)]">
                  Build Command
                </label>
                <input
                  type="text"
                  className="w-full max-w-md px-3 py-2 border border-[var(--app-border)] rounded-[8px] bg-[var(--app-panel)] text-[13px] font-mono text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] focus:outline-none focus:border-[var(--app-accent)] transition-colors"
                  placeholder="npm run build"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[var(--app-text-muted)]">
                  Output Directory
                </label>
                <input
                  type="text"
                  className="w-full max-w-md px-3 py-2 border border-[var(--app-border)] rounded-[8px] bg-[var(--app-panel)] text-[13px] font-mono text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] focus:outline-none focus:border-[var(--app-accent)] transition-colors"
                  placeholder=".next"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium mb-2 text-[var(--app-text-muted)]">
                  Install Command
                </label>
                <input
                  type="text"
                  className="w-full max-w-md px-3 py-2 border border-[var(--app-border)] rounded-[8px] bg-[var(--app-panel)] text-[13px] font-mono text-[var(--app-text)] placeholder:text-[var(--app-text-dim)] focus:outline-none focus:border-[var(--app-accent)] transition-colors"
                  placeholder="npm install"
                />
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-[13px] font-medium mb-4 text-[var(--app-text)]">
              Environment
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-[8px] border border-[var(--app-border)] bg-[var(--app-panel)]">
                <div>
                  <h3 className="text-[13px] font-medium text-[var(--app-text)]">
                    Development Mode
                  </h3>
                  <p className="text-[13px] text-[var(--app-text-muted)]">
                    Enable development mode features and debugging
                  </p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-[var(--app-accent)] transition-colors">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
                </button>
              </div>
            </div>
          </section>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-[var(--app-border)]">
            <button className="px-4 py-2 text-[13px] rounded-[8px] border border-[var(--app-border)] text-[var(--app-text-muted)] hover:bg-[var(--app-surface)] transition-colors">
              Cancel
            </button>
            <button className="px-4 py-2 text-[13px] rounded-[8px] bg-[var(--app-accent)] text-black font-medium hover:opacity-90 transition-opacity">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
