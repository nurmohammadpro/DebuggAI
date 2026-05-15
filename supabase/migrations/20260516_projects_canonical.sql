-- ============================================================================
-- DeBuggAI Projects Canonicalization (backwards compatible)
-- Migration: 20260516
-- Goal:
-- - Make `projects` the canonical root entity without breaking existing URLs.
-- - Preserve existing `?project=<generation_id>` routing by using the first
--   generation's UUID as the project UUID.
-- - Backfill: create one `projects` row per existing generation (where project_id is null)
--   with id = generation.id, then set generations.project_id = generations.id.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ensure generations.project_id exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'generations' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.generations
      ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_generations_project_id ON public.generations(project_id);
  END IF;
END $$;

-- Backfill projects for legacy generations that didn't have a project_id.
-- We intentionally set projects.id = generations.id to keep URL compatibility.
INSERT INTO public.projects (id, user_id, name, description, stack, status, created_at, updated_at)
SELECT
  g.id,
  g.user_id,
  COALESCE(NULLIF(g.description, ''), 'Untitled Project'),
  COALESCE(NULLIF(g.prompt, ''), g.description),
  g.stack,
  'active',
  g.created_at,
  now()
FROM public.generations g
WHERE g.project_id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Set the project_id on those generations to point at the newly created project.
UPDATE public.generations g
SET project_id = g.id
WHERE g.project_id IS NULL;

-- Helpful index for per-project versioning.
CREATE INDEX IF NOT EXISTS idx_generations_project_version
  ON public.generations(project_id, version DESC, created_at DESC);

