/**
 * Environment Variables Settings Page
 */

import { SettingsNav } from '@/components/project/settings-nav';
import { EnvVarsManager } from '@/components/project/env-vars-manager';

interface EnvVarsPageProps {
  params: Promise<{ id: string }>;
}

export default async function EnvVarsPage({ params }: EnvVarsPageProps) {
  const { id: projectId } = await params;

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <SettingsNav projectId={projectId} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          <EnvVarsManager projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
