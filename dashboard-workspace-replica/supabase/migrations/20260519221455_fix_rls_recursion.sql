-- ============================================================================
-- Fix infinite recursion in workspace RLS policies
-- Problem: workspace_members SELECT policy queried workspace_members itself,
-- and workspaces SELECT policy queried workspace_members which queried workspaces.
-- Fix: use SECURITY DEFINER helper + direct column checks to break the cycle.
-- ============================================================================

-- SECURITY DEFINER -> bypasses RLS on workspace_members, no recursion
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

-- Fix workspaces SELECT: use owner_id (direct) + SECURITY DEFINER helper
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces FOR SELECT
  USING (owner_id = auth.uid() OR is_workspace_member(id));

-- Fix workspace_members SELECT: user_id = auth.uid() catches your own row (no cross-ref);
-- the EXISTS on workspaces short-circuits on owner_id = auth.uid() before any recursive check.
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
CREATE POLICY "Users can view workspace members"
  ON workspace_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_id AND owner_id = auth.uid())
  );

-- Fix workspace admins update: queries workspace_members with user_id = auth.uid()
-- which matches first branch of workspace_members SELECT policy (non-recursive).
DROP POLICY IF EXISTS "Workspace admins can update workspaces" ON workspaces;
CREATE POLICY "Workspace admins can update workspaces"
  ON workspaces FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = id AND user_id = auth.uid() AND role = 'admin'
  ));
