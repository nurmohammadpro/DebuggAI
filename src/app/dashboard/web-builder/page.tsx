import { MinimalWebBuilderLayout } from '@/components/dashboard/web-builder/minimal-web-builder-layout';
import { MinimalWebBuilderContent } from '@/components/dashboard/web-builder/minimal-web-builder-content';

export default function DashboardWebBuilderPage() {
  return (
    <MinimalWebBuilderLayout>
      <MinimalWebBuilderContent />
    </MinimalWebBuilderLayout>
  );
}

