-- migration: 20260604000100_project_files.sql
-- Per-file persistence for agent-driven editing.
-- Replaces the single `generations.code TEXT` blob with row-level file storage.

CREATE TABLE IF NOT EXISTS project_files (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path        text NOT NULL,
  content     text NOT NULL DEFAULT '',
  language    text,
  status      text NOT NULL DEFAULT 'unchanged'
              CHECK (status IN ('added','modified','deleted','unchanged')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE      (project_id, path)
);

-- Index for fast lookups by project
CREATE INDEX IF NOT EXISTS idx_project_files_project_id ON project_files(project_id);

-- Index for file search within a project
CREATE INDEX IF NOT EXISTS idx_project_files_path ON project_files(project_id, path);

-- Updated-at trigger (matches existing pattern in migrations)
CREATE OR REPLACE FUNCTION set_project_files_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_files_updated_at ON project_files;
CREATE TRIGGER trg_project_files_updated_at
  BEFORE UPDATE ON project_files
  FOR EACH ROW EXECUTE FUNCTION set_project_files_updated_at();

-- RLS: owner only
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- SELECT policy: owner can read their project's files
DROP POLICY IF EXISTS "project_files_select" ON project_files;
CREATE POLICY "project_files_select" ON project_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- INSERT policy: owner can insert files into their projects
DROP POLICY IF EXISTS "project_files_insert" ON project_files;
CREATE POLICY "project_files_insert" ON project_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- UPDATE policy: owner can update files in their projects
DROP POLICY IF EXISTS "project_files_update" ON project_files;
CREATE POLICY "project_files_update" ON project_files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- DELETE policy: owner can delete files in their projects
DROP POLICY IF EXISTS "project_files_delete" ON project_files;
CREATE POLICY "project_files_delete" ON project_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- GRANT permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON project_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_files TO service_role;
