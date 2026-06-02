/**
 * Push to GitHub API
 *
 * Pushes the project files to the connected GitHub repository
 * using the stored OAuth token and GitHub's Contents API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const { id: projectId } = await params;
  const body = await req.json().catch(() => null) as {
    files?: Record<string, string>;
    commitMessage?: string;
    repoFullName?: string;
    branch?: string;
  } | null;

  if (!body?.files || !body?.repoFullName) {
    return NextResponse.json({ error: 'files and repoFullName are required' }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const branch = body.branch || 'main';
  const commitMessage = body.commitMessage || 'Update from DeBuggAI';

  // Get the GitHub token from project_integrations
  const { data: integrations } = await supabase
    .from('project_integrations')
    .select('access_token_encrypted, config')
    .eq('project_id', projectId)
    .eq('integration_type', 'github')
    .eq('enabled', true)
    .limit(1);

  let token = integrations?.[0]?.access_token_encrypted || integrations?.[0]?.config?.accessToken || null;

  // Fallback: check user identities for GitHub token
  if (!token) {
    const { data: identities } = await supabase
      .from('user_identities')
      .select('identity_data')
      .eq('user_id', auth.user!.id)
      .limit(1);

    const githubIdentity = identities?.find((i: any) => i.identity_data?.provider === 'github');
    token = githubIdentity?.identity_data?.access_token || null;
  }

  if (!token) {
    return NextResponse.json(
      { error: 'GitHub not connected. Connect GitHub in your account settings first.' },
      { status: 400 }
    );
  }

  // Separator: owner/repo
  const [owner, repoName] = body.repoFullName.split('/');
  if (!owner || !repoName) {
    return NextResponse.json({ error: 'Invalid repository name' }, { status: 400 });
  }

  try {
    // Get latest commit SHA for the branch
    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/ref/heads/${branch}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );

    if (!refRes.ok) {
      const errText = await refRes.text().catch(() => '');
      throw new Error(`Failed to get branch ref: ${refRes.status} — ${errText}`);
    }

    const refData = await refRes.json();
    const latestCommitSha = refData.object?.sha;
    if (!latestCommitSha) throw new Error('Could not get latest commit SHA');

    // Get the tree SHA for the latest commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/commits/${latestCommitSha}`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    const commitData = await commitRes.json();
    const baseTreeSha = commitData.tree?.sha;
    if (!baseTreeSha) throw new Error('Could not get base tree SHA');

    // Build a new tree with all project files
    const treeItems = Object.entries(body.files).map(([filePath, content]) => ({
      path: filePath,
      mode: '100644' as const,
      type: 'blob' as const,
      content,
    }));

    // Always include a package.json placeholder if missing
    if (!treeItems.some((t) => t.path === 'package.json')) {
      treeItems.push({
        path: 'package.json',
        mode: '100644',
        type: 'blob',
        content: JSON.stringify({ name: repoName, version: '1.0.0', private: true }, null, 2),
      });
    }

    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeItems }),
      }
    );

    if (!treeRes.ok) {
      const errText = await treeRes.text().catch(() => '');
      throw new Error(`Failed to create tree: ${treeRes.status} — ${errText}`);
    }

    const treeData = await treeRes.json();
    const newTreeSha = treeData.sha;
    if (!newTreeSha) throw new Error('Could not get new tree SHA');

    // Create a commit
    const commitCreateRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/commits`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: commitMessage,
          tree: newTreeSha,
          parents: [latestCommitSha],
        }),
      }
    );

    if (!commitCreateRes.ok) {
      const errText = await commitCreateRes.text().catch(() => '');
      throw new Error(`Failed to create commit: ${commitCreateRes.status} — ${errText}`);
    }

    const newCommit = await commitCreateRes.json();
    const newCommitSha = newCommit.sha;
    if (!newCommitSha) throw new Error('Could not get new commit SHA');

    // Update the branch reference
    const updateRefRes = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: newCommitSha, force: false }),
      }
    );

    if (!updateRefRes.ok) {
      const errText = await updateRefRes.text().catch(() => '');
      throw new Error(`Failed to update ref: ${updateRefRes.status} — ${errText}`);
    }

    return NextResponse.json({
      ok: true,
      commit: { sha: newCommitSha, url: `https://github.com/${owner}/${repoName}/commit/${newCommitSha}` },
      repo: body.repoFullName,
      branch,
      fileCount: treeItems.length,
    });
  } catch (error: any) {
    console.error('[git-push]', error);
    return NextResponse.json({ error: error.message || 'Push failed' }, { status: 500 });
  }
}
