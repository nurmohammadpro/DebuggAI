/**
 * Custom Domains Settings Page
 */

import { SettingsNav } from '@/components/project/settings-nav';
import { DomainsManager } from '@/components/project/domains-manager';

interface DomainsPageProps {
  params: Promise<{ id: string }>;
}

export default async function DomainsPage({ params }: DomainsPageProps) {
  const { id: projectId } = await params;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <SettingsNav projectId={projectId} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <DomainsManager projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
