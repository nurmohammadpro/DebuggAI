-- ============================================================================
-- DeBuggAI Enterprise-Grade Collaboration
-- Workspaces, team management, and real-time collaboration
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Enums for Collaboration
-- ============================================================================

DO $$ BEGIN CREATE TYPE workspace_plan AS ENUM ('team', 'business', 'enterprise'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer'); EXCEPTION WHEN duplicate_object THEN NULL; End $$;
DO $$ BEGIN CREATE TYPE workspace_status AS ENUM ('active', 'suspended', 'archived'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE collaboration_status AS ENUM ('pending', 'accepted', 'declined'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE collaboration_permission AS ENUM ('owner', 'editor', 'viewer', 'commenter'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE collaboration_event_type AS ENUM (
  'cursor_move',
  'edit',
  'selection',
  'comment',
  'presence',
  'version_change'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Workspaces
-- ============================================================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_type workspace_plan NOT NULL DEFAULT 'team',
  status workspace_status NOT NULL DEFAULT 'active',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_status ON workspaces(status);

-- Trigger to generate slug from name
CREATE OR REPLACE FUNCTION generate_workspace_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Ensure uniqueness
    FOR i IN 1..10 LOOP
      IF EXISTS (SELECT 1 FROM workspaces WHERE slug = NEW.slug) THEN
        NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || i;
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspace_slug_trigger ON workspaces;
CREATE TRIGGER workspace_slug_trigger
  BEFORE INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION generate_workspace_slug();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_workspaces_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS workspaces_updated_at ON workspaces;
CREATE TRIGGER workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION update_workspaces_updated_at();

-- ============================================================================
-- Workspace Members
-- ============================================================================
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES profiles(id),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

-- Indexes for workspace members
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON workspace_members(role);

-- ============================================================================
-- Workspace Invitations
-- ============================================================================
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role workspace_role NOT NULL DEFAULT 'member',
  invited_by UUID NOT NULL REFERENCES profiles(id),
  token TEXT UNIQUE NOT NULL,
  status collaboration_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);

-- Indexes for invitations
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_workspace_id ON workspace_invitations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(token);

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.token IS NULL OR NEW.token = '' THEN
    NEW.token := encode(extensions.gen_random_bytes(32), 'base64');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS invitation_token_trigger ON workspace_invitations;
CREATE TRIGGER invitation_token_trigger
  BEFORE INSERT ON workspace_invitations
  FOR EACH ROW
  EXECUTE FUNCTION generate_invitation_token();

-- ============================================================================
-- Project Collaboration
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_collaborators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission collaboration_permission NOT NULL DEFAULT 'viewer',
  added_by UUID REFERENCES profiles(id),
  status collaboration_status NOT NULL DEFAULT 'accepted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for project collaborators
CREATE INDEX IF NOT EXISTS idx_project_collaborators_project_id ON project_collaborators(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON project_collaborators(user_id);

-- Ensure user isn't both owner and collaborator
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_collaborators_unique
  ON project_collaborators(project_id, user_id)
  WHERE status = 'accepted';

-- ============================================================================
-- Collaboration Events (Real-time)
-- ============================================================================
CREATE TABLE IF NOT EXISTS collaboration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  event_type collaboration_event_type NOT NULL,
  event_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for collaboration events (partition by time for performance)
CREATE INDEX IF NOT EXISTS idx_collaboration_events_project_created
  ON collaboration_events(project_id, created_at DESC);

-- Note: Partial index on recent events with now() is not possible
-- because now() is STABLE, not IMMUTABLE. Use the regular index above
-- and add a periodic cleanup job (e.g., delete events older than 30 days).

-- ============================================================================
-- Comments on Collaborations
-- ============================================================================
CREATE TABLE IF NOT EXISTS project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES web_builder_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  parent_id UUID REFERENCES project_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  file_path TEXT,
  line_number INTEGER,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_user_id ON project_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_parent_id ON project_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_resolved ON project_comments(resolved);

-- Trigger to update updated_at
DROP TRIGGER IF EXISTS project_comments_updated_at ON project_comments;
CREATE TRIGGER project_comments_updated_at
  BEFORE UPDATE ON project_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_workspaces_updated_at();

-- ============================================================================
-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

-- Helper: check workspace membership (SECURITY DEFINER, bypasses RLS → no recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workspace_members WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  );
$$;

-- Workspaces RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces FOR SELECT
  USING (owner_id = auth.uid() OR is_workspace_member(id));

DROP POLICY IF EXISTS "Workspace owners can manage workspaces" ON workspaces;
CREATE POLICY "Workspace owners can manage workspaces"
  ON workspaces FOR ALL
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
CREATE POLICY "Workspace admins can update workspaces"
  ON workspaces FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = id AND user_id = auth.uid() AND role = 'admin'
  ));

-- Workspace Members RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
CREATE POLICY "Users can view workspace members"
  ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Workspace owners can manage members" ON workspace_members;
CREATE POLICY "Workspace owners can manage members"
  ON workspace_members FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Workspace admins can invite members" ON workspace_members;
CREATE POLICY "Workspace admins can invite members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces
      WHERE owner_id = auth.uid()
      OR id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

-- Workspace Invitations RLS
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view invitations for their workspaces" ON workspace_invitations;
CREATE POLICY "Users can view invitations for their workspaces"
  ON workspace_invitations FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      OR id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

DROP POLICY IF EXISTS "Users can create invitations for their workspaces" ON workspace_invitations;
CREATE POLICY "Users can create invitations for their workspaces"
  ON workspace_invitations FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
      OR id IN (
        SELECT workspace_id FROM workspace_members
        WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

-- Project Collaborators RLS
ALTER TABLE project_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view collaborators for their projects" ON project_collaborators;
CREATE POLICY "Users can view collaborators for their projects"
  ON project_collaborators FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Project owners can manage collaborators" ON project_collaborators;
CREATE POLICY "Project owners can manage collaborators"
  ON project_collaborators FOR ALL
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
  );

-- Collaboration Events RLS
ALTER TABLE collaboration_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events for their collaborative projects" ON collaboration_events;
CREATE POLICY "Users can view events for their collaborative projects"
  ON collaboration_events FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
    OR project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create events for collaborative projects" ON collaboration_events;
CREATE POLICY "Users can create events for collaborative projects"
  ON collaboration_events FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      project_id IN (
        SELECT project_id FROM project_collaborators
        WHERE user_id = auth.uid() AND status = 'accepted'
      )
      OR project_id IN (
        SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
      )
    )
  );

-- Project Comments RLS
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view comments for their projects" ON project_comments;
CREATE POLICY "Users can view comments for their projects"
  ON project_comments FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
    )
    OR project_id IN (
      SELECT project_id FROM project_collaborators
      WHERE user_id = auth.uid() AND status = 'accepted'
    )
  );

DROP POLICY IF EXISTS "Users can create comments for their projects" ON project_comments;
CREATE POLICY "Users can create comments for their projects"
  ON project_comments FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (
      project_id IN (
        SELECT id FROM web_builder_sessions WHERE user_id = auth.uid()
      )
      OR project_id IN (
        SELECT project_id FROM project_collaborators
        WHERE user_id = auth.uid() AND status = 'accepted' AND permission IN ('editor', 'commenter')
      )
    )
  );

DROP POLICY IF EXISTS "Comment authors can update their comments" ON project_comments;
CREATE POLICY "Comment authors can update their comments"
  ON project_comments FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Get user's workspaces
CREATE OR REPLACE FUNCTION get_user_workspaces(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  role workspace_role,
  plan_type workspace_plan,
  member_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.slug,
    COALESCE(wm.role, 'owner') as role,
    w.plan_type,
    (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id)
  FROM workspaces w
  LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = p_user_id
  WHERE w.owner_id = p_user_id
    OR wm.user_id = p_user_id
  ORDER BY w.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add user to workspace
CREATE OR REPLACE FUNCTION add_workspace_member(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role workspace_role DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
  v_member_id UUID;
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (p_workspace_id, p_user_id, p_role)
  ON CONFLICT (workspace_id, user_id)
  DO UPDATE SET role = p_role
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Realtime Subscriptions
-- ============================================================================

-- Enable realtime for collaboration tables
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_events; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE project_comments; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE workspace_members; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE workspaces IS 'Team workspaces for collaboration and project management';
COMMENT ON TABLE workspace_members IS 'Workspace membership with roles (owner, admin, member, viewer)';
COMMENT ON TABLE workspace_invitations IS 'Pending invitations to join workspaces';
COMMENT ON TABLE project_collaborators IS 'Direct project-level collaboration with permissions';
COMMENT ON TABLE collaboration_events IS 'Real-time collaboration events (cursor, edits, presence)';
COMMENT ON TABLE project_comments IS 'Comments and discussions on projects with file/line references';
