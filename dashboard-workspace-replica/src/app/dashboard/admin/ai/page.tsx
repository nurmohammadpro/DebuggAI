import { AdminRouteGuard } from '@/components/admin/admin-route-guard';
import { AdminAiProvider } from '@/components/admin/admin-ai-provider';

export default function AdminAiProviderPage() {
  return (
    <AdminRouteGuard>
      <AdminAiProvider />
    </AdminRouteGuard>
  );
}

