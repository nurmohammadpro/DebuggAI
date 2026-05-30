import { supabase } from '@/lib/supabase';
import { csrfHeader } from '@/lib/csrf-client';

export async function createProjectFromGeneration({
  name,
  stack,
  prompt,
  createdFrom = 'dashboard',
  token: providedToken,
}: {
  name: string;
  stack: string;
  prompt: string;
  createdFrom?: string;
  token?: string;
}) {
  const projectKey = crypto.randomUUID();
  const code = starterCode(name.trim());

  const token = providedToken ?? (await supabase.auth.getSession()).data.session?.access_token ?? null;
  if (!token) throw new Error('Please sign in again');

  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...csrfHeader(),
    },
    body: JSON.stringify({
      description: name.trim(),
      stack,
      prompt,
      code,
      metadata: { project_key: projectKey, created_from: createdFrom },
    }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.error || 'Failed to create project');
  }

  if (!payload?.id) throw new Error('Failed to create project');

  return {
    id: payload.id as string,
    projectKey,
    durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : undefined,
  };
}

function starterCode(name: string) {
  return `import * as React from 'react';

export default function App() {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif' }}>
      <h1 style={{ margin: 0, fontSize: 24 }}>${escapeTemplate(name)}</h1>
      <p style={{ marginTop: 8, color: '#6b7280' }}>
        Start building in the editor, or ask the assistant to generate the app.
      </p>
    </div>
  );
}
`;
}

function escapeTemplate(value: string) {
  return value.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}
