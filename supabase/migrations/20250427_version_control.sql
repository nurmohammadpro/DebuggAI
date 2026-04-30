-- ============================================================================
-- DeBuggAI Enterprise-Grade Version Control
-- Branches, pull requests, and Git integration
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Enums for Version Control
-- ============================================================================

CREATE TYPE pr_status AS ENUM ('open', 'review', 'approved', 'rejected', 'merged');
CREATE TYPE pr_merge_strategy AS ENUM ('merge', 'squash', 'rebase');
CREATE TYPE git_provider AS ENUM ('github', 'gitlab', 'bitbucket', 'custom');

-- ============================================================================
-- Project Branches
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_from UUID REFERENCES web_builder_versions(id),
  created_by UUID NOT NULL REFERENCES profiles(id),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  last_commit_id TEXT,
  last_committed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

-- Indexes for branches
CREATE INDEX IF NOT EXISTS idx_project_branches_project_id ON project_branches(project_id);
CREATE INDEX IF NOT EXISTS idx_project_branches_created_from ON project_branches(created_from);
CREATE INDEX IF NOT EXISTS idx_project_branches_created_by ON project_branches(created_by);

-- Ensure only one default branch per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_branches_default
  ON project_branches(project_id)
  WHERE is_default = true;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_branches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER branches_updated_at
  BEFORE UPDATE ON project_branches
  FOR EACH ROW
  EXECUTE FUNCTION update_branches_updated_at();

-- ============================================================================
-- Pull Requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  from_branch_id UUID NOT NULL REFERENCES project_branches(id) ON DELETE CASCADE,
  to_branch_id UUID NOT NULL REFERENCES project_branches(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status pr_status NOT NULL DEFAULT 'open',
  merge_strategy pr_merge_strategy DEFAULT 'merge',
  created_by UUID NOT NULL REFERENCES profiles(id),
  reviewed_by UUID REFERENCES profiles(id),
  merged_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  merged_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Indexes for pull requests
CREATE INDEX IF NOT EXISTS idx_pull_requests_project_id ON pull_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_from_branch ON pull_requests(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_to_branch ON pull_requests(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_created_by ON pull_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_pull_requests_status ON pull_requests(status);
CREATE INDEX IF NOT EXISTS idx_pull_requests_updated_at ON pull_requests(updated_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER pull_requests_updated_at
  BEFORE UPDATE ON pull_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_branches_updated_at();

-- ============================================================================
-- Pull Request Comments
-- ============================================================================
CREATE TABLE IF NOT EXISTS pr_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  parent_id UUID REFERENCES pr_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  file_path TEXT,
  line_number INTEGER,
  diff_hunk TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for PR comments
CREATE INDEX IF NOT EXISTS idx_pr_comments_pr_id ON pr_comments(pr_id);
CREATE INDEX IF NOT EXISTS idx_pr_comments_user_id ON pr_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_pr_comments_parent_id ON pr_comments(parent_id);

-- Trigger to update updated_at
CREATE TRIGGER pr_comments_updated_at
  BEFORE UPDATE ON pr_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_branches_updated_at();

-- ============================================================================
-- PR Reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS pr_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending',
  approved_changes BOOLEAN DEFAULT true,
  body TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for PR reviews
CREATE INDEX IF NOT EXISTS idx_pr_reviews_pr_id ON pr_reviews(pr_id);
CREATE INDEX IF NOT EXISTS idx_pr_reviews_reviewer_id ON pr_reviews(reviewer_id);

-- Ensure one review per reviewer per PR
CREATE UNIQUE INDEX IF NOT EXISTS idx_pr_reviews_unique
  ON pr_reviews(pr_id, reviewer_id);

-- Trigger to update updated_at
CREATE TRIGGER pr_reviews_updated_at
  BEFORE UPDATE ON pr_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_branches_updated_at();

-- ============================================================================
-- Git Integration
-- ============================================================================
CREATE TABLE IF NOT EXISTS git_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  provider git_provider NOT NULL,
  repository_url TEXT NOT NULL,
  branch TEXT NOT NULL DEFAULT 'main',
  access_token_encrypted TEXT,
  webhook_id TEXT,
  last_synced_at TIMESTAMPTZ,
  last_commit_sha TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_deploy BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id)
);

-- Index for git integrations
CREATE INDEX IF NOT EXISTS idx_git_integrations_project_id ON git_integrations(project_id);
CREATE INDEX IF NOT EXISTS idx_git_integrations_provider ON git_integrations(provider);

-- Trigger to update updated_at
CREATE TRIGGER git_integrations_updated_at
  BEFORE UPDATE ON git_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_branches_updated_at();

-- ============================================================================
-- Deployments
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES project_branches(id),
  pr_id UUID REFERENCES pull_requests(id),
  environment TEXT NOT NULL DEFAULT 'production',
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  deployment_url TEXT,
  commit_sha TEXT,
  commit_message TEXT,
  deployed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Add constraint for valid deployment providers
ALTER TABLE deployments
  ADD CONSTRAINT valid_deployment_provider
  CHECK (provider IN ('vercel', 'netlify', 'aws', 'custom'));

-- Add constraint for valid environments
ALTER TABLE deployments
  ADD CONSTRAINT valid_deployment_environment
  CHECK (environment IN ('production', 'preview', 'development'));

-- Add constraint for valid statuses
ALTER TABLE deployments
  ADD CONSTRAINT valid_deployment_status
  CHECK (status IN ('pending', 'building', 'success', 'failed', 'cancelled'));

-- Indexes for deployments
CREATE INDEX IF NOT EXISTS idx_deployments_project_id ON deployments(project_id);
CREATE INDEX IF NOT EXISTS idx_deployments_branch_id ON deployments(branch_id);
CREATE INDEX IF NOT EXISTS idx_deployments_pr_id ON deployments(pr_id);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER deployments_updated_at
  BEFORE UPDATE ON deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_branches_updated_at();

-- ============================================================================
-- Deployment Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS deployment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add constraint for valid log levels
ALTER TABLE deployment_logs
  ADD CONSTRAINT valid_log_level
  CHECK (level IN ('info', 'warning', 'error', 'debug'));

-- Index for deployment logs
CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Project Branches RLS
ALTER TABLE project_branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view branches for their projects"
  ON project_branches FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage branches"
  ON project_branches FOR ALL
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
  );

-- Pull Requests RLS
ALTER TABLE pull_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PRs for their projects"
  ON pull_requests FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage PRs"
  ON pull_requests FOR ALL
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
  );

-- PR Comments RLS
ALTER TABLE pr_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PR comments"
  ON pr_comments FOR SELECT
  USING (
    pr_id IN (
      SELECT id FROM pull_requests
      WHERE project_id IN (
        SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create PR comments"
  ON pr_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND pr_id IN (
      SELECT id FROM pull_requests
      WHERE project_id IN (
        SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Comment authors can update their comments"
  ON pr_comments FOR UPDATE
  USING (user_id = auth.uid());

-- PR Reviews RLS
ALTER TABLE pr_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view PR reviews"
  ON pr_reviews FOR SELECT
  USING (
    pr_id IN (
      SELECT id FROM pull_requests
      WHERE project_id IN (
        SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create PR reviews"
  ON pr_reviews FOR INSERT
  WITH CHECK (
    reviewer_id = auth.uid()
    AND pr_id IN (
      SELECT id FROM pull_requests
      WHERE project_id IN (
        SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Reviewers can update their reviews"
  ON pr_reviews FOR UPDATE
  USING (reviewer_id = auth.uid());

-- Git Integrations RLS
ALTER TABLE git_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view git integrations for their projects"
  ON git_integrations FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage git integrations"
  ON git_integrations FOR ALL
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
  );

-- Deployments RLS
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deployments for their projects"
  ON deployments FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage deployments"
  ON deployments FOR ALL
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
  );

-- Deployment Logs RLS
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs for their deployments"
  ON deployment_logs FOR SELECT
  USING (
    deployment_id IN (
      SELECT id FROM deployments
      WHERE project_id IN (
        SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
      )
    )
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Create branch from version
CREATE OR REPLACE FUNCTION create_branch_from_version(
  p_project_id UUID,
  p_branch_name TEXT,
  p_from_version UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  INSERT INTO project_branches (project_id, name, created_from, created_by)
  VALUES (p_project_id, p_branch_name, p_from_version, p_user_id)
  RETURNING id INTO v_branch_id;

  RETURN v_branch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Merge pull request
CREATE OR REPLACE FUNCTION merge_pull_request(
  p_pr_id UUID,
  p_merge_strategy pr_merge_strategy DEFAULT 'merge',
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_pr RECORD;
BEGIN
  -- Lock the PR row
  SELECT * INTO v_pr
  FROM pull_requests
  WHERE id = p_pr_id
  FOR UPDATE;

  -- Check if PR can be merged
  IF v_pr.status NOT IN ('approved', 'open') THEN
    RAISE EXCEPTION 'Pull request cannot be merged in current status';
  END IF;

  -- Update PR status
  UPDATE pull_requests
  SET status = 'merged',
      merge_strategy = p_merge_strategy,
      merged_by = p_user_id,
      merged_at = now()
  WHERE id = p_pr_id;

  -- Create deployment for merged branch
  INSERT INTO deployments (project_id, branch_id, pr_id, environment, provider, status, deployed_by)
  SELECT v_pr.project_id, v_pr.to_branch_id, p_pr_id, 'production', 'vercel', 'pending', p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get project branches with metadata
CREATE OR REPLACE FUNCTION get_project_branches(p_project_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  is_default BOOLEAN,
  is_locked BOOLEAN,
  created_by TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  commit_count BIGINT,
  open_pr_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.description,
    b.is_default,
    b.is_locked,
    p.display_name as created_by,
    b.created_at,
    b.updated_at,
    (SELECT COUNT(*) FROM web_builder_versions WHERE branch_id = b.id) as commit_count,
    (SELECT COUNT(*) FROM pull_requests WHERE from_branch_id = b.id AND status NOT IN ('merged', 'rejected')) as open_pr_count
  FROM project_branches b
  LEFT JOIN profiles p ON p.id = b.created_by
  WHERE b.project_id = p_project_id
  ORDER BY b.is_default DESC, b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE project_branches IS 'Branch management for projects with version control';
COMMENT ON TABLE pull_requests IS 'Pull requests for code review and merging';
COMMENT ON TABLE pr_comments IS 'Comments on pull requests with file/line references';
COMMENT ON TABLE pr_reviews IS 'Formal reviews of pull requests by team members';
COMMENT ON TABLE git_integrations IS 'Git provider integrations (GitHub, GitLab, Bitbucket)';
COMMENT ON TABLE deployments IS 'Deployment records and status tracking';
COMMENT ON TABLE deployment_logs IS 'Detailed logs for deployment operations';
