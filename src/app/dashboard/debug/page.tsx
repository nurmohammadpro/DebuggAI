import { MinimalDebugLayout } from '@/components/dashboard/debug/minimal-debug-layout';
import { MinimalDebugContent } from '@/components/dashboard/debug/minimal-debug-content';

export default function DebugScreenPage() {
  return (
    <MinimalDebugLayout>
      <MinimalDebugContent />
    </MinimalDebugLayout>
  );
}

