import { getSession } from '@/hooks/use-session';


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

  const token = providedToken ?? (await getSession()).session?.access_token ?? null;
  if (!token) throw new Error('Please sign in again');

  // Abort after 15s — prevents infinite spinner on network errors
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        
      },
      body: JSON.stringify({
        description: name.trim(),
        stack,
        prompt,
        code,
        metadata: { project_key: projectKey, created_from: createdFrom },
      }),
      signal: controller.signal,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(payload?.error || `Server error (${res.status})`);
    }

    if (!payload?.id) throw new Error('Failed to create project');

    return {
      id: payload.id as string,
      projectKey,
      durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : undefined,
    };
  } finally {
    clearTimeout(timeoutId);
  }
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
