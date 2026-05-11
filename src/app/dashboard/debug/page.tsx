import { UnifiedLayout } from '@/components/dashboard/sidebar/unified-layout';
import { MinimalDebugContent } from '@/components/dashboard/debug/minimal-debug-content';

export default function DebugScreenPage() {
  return (
    <UnifiedLayout title="Debug Session" subtitle="AI-powered code debugging">
      <MinimalDebugContent />
    </UnifiedLayout>
  );
}

