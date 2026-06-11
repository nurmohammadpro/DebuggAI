-- Repair builder persistence schema drift.
-- Safe to run repeatedly against existing Supabase projects.

CREATE TABLE IF NOT EXISTS public.project_files (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  path        text NOT NULL,
  content     text NOT NULL DEFAULT '',
  language    text,
  status      text NOT NULL DEFAULT 'unchanged'
              CHECK (status IN ('added','modified','deleted','unchanged')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE      (project_id, path)
);

CREATE INDEX IF NOT EXISTS idx_project_files_project_id
  ON public.project_files(project_id);

CREATE INDEX IF NOT EXISTS idx_project_files_path
  ON public.project_files(project_id, path);

CREATE OR REPLACE FUNCTION public.set_project_files_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_project_files_updated_at ON public.project_files;
CREATE TRIGGER trg_project_files_updated_at
  BEFORE UPDATE ON public.project_files
  FOR EACH ROW EXECUTE FUNCTION public.set_project_files_updated_at();

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_files_select ON public.project_files;
CREATE POLICY project_files_select ON public.project_files
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_files_insert ON public.project_files;
CREATE POLICY project_files_insert ON public.project_files
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_files_update ON public.project_files;
CREATE POLICY project_files_update ON public.project_files
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS project_files_delete ON public.project_files;
CREATE POLICY project_files_delete ON public.project_files
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_files.project_id
        AND projects.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files TO service_role;

ALTER TABLE public.thread_messages
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

UPDATE public.thread_messages tm
SET project_id = t.project_id,
    metadata = COALESCE(tm.metadata, '{}'::jsonb) || jsonb_build_object('project_id', t.project_id)
FROM public.threads t
WHERE tm.thread_id = t.id
  AND t.project_id IS NOT NULL
  AND tm.project_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_thread_messages_project_created
  ON public.thread_messages(project_id, created_at DESC)
  WHERE project_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.parse_generation_code_to_project_files(
  db_project_id uuid,
  db_code text
)
RETURNS void AS $$
DECLARE
  lines text[];
  current_file text := '';
  current_content text := '';
  current_lang text := '';
  is_in_fence boolean := false;
  line text;
BEGIN
  IF db_project_id IS NULL OR db_code IS NULL OR btrim(db_code) = '' THEN
    RETURN;
  END IF;

  lines := string_to_array(db_code, E'\n');

  FOREACH line IN ARRAY lines LOOP
    IF NOT is_in_fence AND (line ~ '^\s*//\s*File:\s*[\w./-]+\.[a-zA-Z0-9]+\s*$') THEN
      IF current_file != '' AND btrim(current_content) != '' THEN
        INSERT INTO public.project_files (project_id, path, content, language, status)
        VALUES (db_project_id, current_file, current_content, current_lang, 'unchanged')
        ON CONFLICT (project_id, path) DO UPDATE
          SET content = EXCLUDED.content,
              language = EXCLUDED.language,
              updated_at = now();
      END IF;

      current_file := regexp_replace(line, '^\s*//\s*File:\s*', '');
      current_content := '';
      current_lang := '';
      is_in_fence := false;
      CONTINUE;
    END IF;

    IF NOT is_in_fence AND line ~ '^\s*```' THEN
      is_in_fence := true;
      current_lang := regexp_replace(line, '^\s*```', '');
      CONTINUE;
    END IF;

    IF is_in_fence AND line ~ '^\s*```' THEN
      is_in_fence := false;
      CONTINUE;
    END IF;

    IF current_file != '' THEN
      IF current_content = '' THEN
        current_content := line;
      ELSE
        current_content := current_content || E'\n' || line;
      END IF;
    END IF;
  END LOOP;

  IF current_file != '' AND btrim(current_content) != '' THEN
    INSERT INTO public.project_files (project_id, path, content, language, status)
    VALUES (db_project_id, current_file, current_content, current_lang, 'unchanged')
    ON CONFLICT (project_id, path) DO UPDATE
      SET content = EXCLUDED.content,
          language = EXCLUDED.language,
          updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  gen RECORD;
BEGIN
  FOR gen IN
    SELECT DISTINCT ON (project_id) project_id, code
    FROM public.generations
    WHERE project_id IS NOT NULL
      AND code IS NOT NULL
      AND btrim(code) != ''
    ORDER BY project_id, version DESC, created_at DESC
  LOOP
    PERFORM public.parse_generation_code_to_project_files(gen.project_id, gen.code);
  END LOOP;
END;
$$;
