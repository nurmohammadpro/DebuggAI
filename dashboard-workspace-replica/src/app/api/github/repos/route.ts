/**
 * GitHub Repos API
 *
 * Lists the authenticated user's GitHub repositories using the stored OAuth token.
 * Requires a GitHub integration to be connected for the selected project.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { requireUser } from '@/lib/server/auth';
import { createSupabaseAdmin } from '@/lib/server/supabase-admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (auth.errorResponse) return auth.errorResponse;

  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const page = Math.max(1, Number(url.searchParams.get('page') || 1));
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get('perPage') || 30)));

  try {
    const supabase = createSupabaseAdmin();

    // Get GitHub token from project_integrations
    let token: string | null = null;

    if (projectId) {
      const { data: integrations, error: intErr } = await supabase
        .from('project_integrations')
        .select('config, access_token_encrypted')
        .eq('project_id', projectId)
        .eq('integration_type', 'github')
        .eq('enabled', true)
        .limit(1);

      if (!intErr && integrations?.length) {
        const integration = integrations[0];
        // Token may be in access_token_encrypted or config.accessToken
        token = integration.access_token_encrypted || integration.config?.accessToken || null;
      }
    }

    // Fallback: check user_identities for GitHub provider token
    if (!token) {
      const { data: identities } = await supabase
        .from('user_identities')
        .select('identity_data')
        .eq('user_id', auth.user!.id)
        .eq('provider', 'github')
        .limit(1);

      if (identities?.length) {
        const idData = identities[0].identity_data as Record<string, unknown> | null;
        token = (idData?.access_token as string) || null;
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'GitHub not connected. Connect your GitHub account first.' },
        { status: 400 }
      );
    }

    // Fetch repos from GitHub API
    const ghUrl = new URL('https://api.github.com/user/repos');
    ghUrl.searchParams.set('per_page', String(perPage));
    ghUrl.searchParams.set('page', String(page));
    ghUrl.searchParams.set('sort', 'updated');
    ghUrl.searchParams.set('direction', 'desc');
    ghUrl.searchParams.set('type', 'owner');

    const ghRes = await fetch(ghUrl.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'DebuggAI',
      },
    });

    if (!ghRes.ok) {
      const err = await ghRes.text();
      console.error('GitHub API error:', err);
      return NextResponse.json({ error: 'Failed to fetch repositories from GitHub' }, { status: 502 });
    }

    const repos = await ghRes.json();
    const linkHeader = ghRes.headers.get('link');

    const simplified = (Array.isArray(repos) ? repos : []).map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      private: repo.private,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch,
      language: repo.language,
      stars: repo.stargazers_count,
      updatedAt: repo.updated_at,
    }));

    return NextResponse.json({
      repos: simplified,
      hasMore: !!linkHeader?.includes('rel="next"'),
      page,
    });
  } catch (err: any) {
    console.error('GitHub repos error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
