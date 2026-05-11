import { UnifiedLayout } from '@/components/dashboard/sidebar/unified-layout';
import { MinimalWebBuilderContent } from '@/components/dashboard/web-builder/minimal-web-builder-content';

export default function DashboardWebBuilderPage() {
  return (
    <UnifiedLayout title="Web Builder" subtitle="Build and preview your web applications">
      <MinimalWebBuilderContent />
    </UnifiedLayout>
  );
}

