'use client';

import { useParams } from 'next/navigation';
import { RunDetails } from '@/components/dashboard/runs/run-details';

export default function RunDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  return <RunDetails runId={id} />;
}

