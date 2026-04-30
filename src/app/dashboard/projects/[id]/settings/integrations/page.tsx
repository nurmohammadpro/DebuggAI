/**
 * Integrations Settings Page
 */

import { SettingsNav } from '@/components/project/settings-nav';
import { IntegrationsManager } from '@/components/project/integrations-manager';

interface IntegrationsPageProps {
  params: Promise<{ id: string }>;
}

export default async function IntegrationsPage({ params }: IntegrationsPageProps) {
  const { id: projectId } = await params;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <SettingsNav projectId={projectId} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <IntegrationsManager projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
