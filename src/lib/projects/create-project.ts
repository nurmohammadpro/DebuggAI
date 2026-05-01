import { supabase } from '@/lib/supabase';

export async function createProjectFromGeneration({
  userId,
  name,
  stack,
  prompt,
  createdFrom = 'dashboard',
}: {
  userId: string;
  name: string;
  stack: string;
  prompt: string;
  createdFrom?: string;
}) {
  const projectKey = crypto.randomUUID();
  const code = starterCode(name.trim());

  const { data, error } = await supabase
    .from('generations')
    .insert({
      user_id: userId,
      code,
      version: 1,
      description: name.trim(),
      stack,
      prompt,
      metadata: { project_key: projectKey, created_from: createdFrom },
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!data?.id) throw new Error('Failed to create project');

  return { id: data.id, projectKey };
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

