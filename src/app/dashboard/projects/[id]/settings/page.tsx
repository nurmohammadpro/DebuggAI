/**
 * Project Settings Page
 * Main project settings page with general configuration options
 */

import { SettingsNav } from '@/components/project/settings-nav';
import { notFound } from 'next/navigation';

interface ProjectSettingsPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectSettingsPage({ params }: ProjectSettingsPageProps) {
  const { id: projectId } = await params;

  // TODO: Fetch project to verify it exists
  // For now, we'll just render the page

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <SettingsNav projectId={projectId} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold">General Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your project configuration and preferences
            </p>
          </div>

          {/* Project Name */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Project Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Project Name</label>
                <input
                  type="text"
                  className="w-full max-w-md px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="My Project"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <textarea
                  className="w-full max-w-md px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  rows={3}
                  placeholder="Describe your project..."
                />
              </div>
            </div>
          </section>

          {/* Framework & Runtime */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Framework & Runtime</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Framework</label>
                <select className="w-full max-w-md px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="nextjs">Next.js</option>
                  <option value="react">React</option>
                  <option value="vue">Vue</option>
                  <option value="svelte">Svelte</option>
                  <option value="nuxt">Nuxt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Node Version</label>
                <select className="w-full max-w-md px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="20">20.x</option>
                  <option value="18">18.x</option>
                  <option value="16">16.x</option>
                </select>
              </div>
            </div>
          </section>

          {/* Build Settings */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Build Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Build Command</label>
                <input
                  type="text"
                  className="w-full max-w-md px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="npm run build"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Output Directory</label>
                <input
                  type="text"
                  className="w-full max-w-md px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder=".next"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Install Command</label>
                <input
                  type="text"
                  className="w-full max-w-md px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="npm install"
                />
              </div>
            </div>
          </section>

          {/* Environment */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-4">Environment</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">Development Mode</h3>
                  <p className="text-sm text-muted-foreground">
                    Enable development mode features and debugging
                  </p>
                </div>
                <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary transition-colors">
                  <span className="translate-x-6 inline-block h-4 w-4 transform rounded-full bg-white transition-transform" />
                </button>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <button className="px-4 py-2 text-sm rounded-lg border hover:bg-accent transition-colors">
              Cancel
            </button>
            <button className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
