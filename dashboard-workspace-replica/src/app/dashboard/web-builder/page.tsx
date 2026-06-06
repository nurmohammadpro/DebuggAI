'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Web Builder entrypoint.
 *
 * The actual "Manus/Codex-style" workspace lives at `/dashboard?project=...`
 * (sidebar + chat + code/preview). This route is a convenience alias.
 */
export default function DashboardWebBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const project = searchParams.get('project');
    const thread = searchParams.get('thread');

    if (project) {
      const qs = new URLSearchParams();
      qs.set('project', project);
      if (thread) qs.set('thread', thread);
      router.replace(`/dashboard?${qs.toString()}`);
      return;
    }

    // No project selected: send user to Projects with "create project" open.
    router.replace('/dashboard/home?create=1');
  }, [router, searchParams]);

  return null;
}
