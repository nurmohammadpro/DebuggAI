/**
 * Dashboard Home Page - DeBuggAI Design System v1.0
 *
 * Professional · Minimal · Developer-focused · Dark-first
 */

// Note: the main dashboard route now renders the workspace UI. This page is kept at `/dashboard/home`.

'use client';

import { ProjectsHub } from '@/components/dashboard/projects/projects-hub';

export default function DashboardPage() {
  return <ProjectsHub />;
}
