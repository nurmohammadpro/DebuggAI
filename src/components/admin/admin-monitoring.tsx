'use client';

import { useRouter } from 'next/navigation';
import { Activity, ExternalLink, Loader2 } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AdminRouteGuard } from '@/components/admin/admin-route-guard';

export function AdminMonitoring() {
  const router = useRouter();

  return (
    <AdminRouteGuard>
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">System Monitoring</h1>
          <Badge variant="gray" className="ml-2">
            Not configured
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Monitoring UI is ready. Connect a health endpoint to show real-time status.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Health checks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Add an admin health endpoint (example:{' '}
            <span className="font-mono text-xs text-foreground/80">
              GET /api/admin/health
            </span>
            ) or a Supabase Edge Function, then wire it into this page.
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push('/dashboard/admin')}>
              Back to analytics
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                window.open('https://supabase.com/docs/guides/functions', '_blank')
              }
            >
              Supabase Functions
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    </AdminRouteGuard>
  );
}
