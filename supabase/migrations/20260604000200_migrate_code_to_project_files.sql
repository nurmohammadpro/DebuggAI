-- migration: 20260604000200_migrate_code_to_project_files.sql
-- Migrates existing `generations.code TEXT` blobs into the new `project_files` table.
-- Each generation version becomes a set of project_files rows keyed by (project_id, path).
-- This runs once; subsequent writes go directly to project_files.

-- Function to parse // File: markers from serialized generation code
CREATE OR REPLACE FUNCTION parse_generation_code(db_project_id uuid, db_code text)
RETURNS void AS $$
DECLARE
  lines text[];
  current_file text := '';
  current_content text := '';
  current_lang text := '';
  is_in_fence boolean := false;
  line text;
BEGIN
  IF db_code IS NULL OR db_code = '' THEN RETURN; END IF;

  lines := string_to_array(db_code, E'\n');

  FOREACH line IN ARRAY lines LOOP
    -- Detect file markers: // File: path/to/file.tsx
    IF NOT is_in_fence AND (line ~ '^\s*//\s*File:\s*[\w./-]+\.[a-zA-Z0-9]+\s*$') THEN
      -- Flush previous file
      IF current_file != '' AND current_content != '' THEN
        INSERT INTO project_files (project_id, path, content, language, status)
        VALUES (db_project_id, current_file, current_content, current_lang, 'unchanged')
        ON CONFLICT (project_id, path) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
      END IF;

      -- Start new file
      current_file := regexp_replace(line, '^\s*//\s*File:\s*', '');
      current_content := '';
      current_lang := '';
      is_in_fence := false;
      CONTINUE;
    END IF;

    -- Detect code fence open
    IF NOT is_in_fence AND line ~ '^\s*```' THEN
      is_in_fence := true;
      -- Extract language hint
      current_lang := regexp_replace(line, '^\s*```', '');
      CONTINUE;
    END IF;

    -- Detect code fence close
    IF is_in_fence AND line ~ '^\s*```' THEN
      is_in_fence := false;
      CONTINUE;
    END IF;

    -- Collect content
    IF current_file != '' THEN
      IF current_content = '' THEN
        current_content := line;
      ELSE
        current_content := current_content || E'\n' || line;
      END IF;
    END IF;
  END LOOP;

  -- Flush last file
  IF current_file != '' AND current_content != '' THEN
    INSERT INTO project_files (project_id, path, content, language, status)
    VALUES (db_project_id, current_file, current_content, current_lang, 'unchanged')
    ON CONFLICT (project_id, path) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Run migration: iterate over all existing generations and extract files
DO $$
DECLARE
  gen RECORD;
BEGIN
  FOR gen IN
    SELECT DISTINCT ON (project_id) project_id, code
    FROM generations
    WHERE code IS NOT NULL AND code != ''
    ORDER BY project_id, version DESC
  LOOP
    PERFORM parse_generation_code(gen.project_id, gen.code);
  END LOOP;
END;
$$;

-- Optional: drop the helper function after migration (uncomment to clean up)
-- DROP FUNCTION IF EXISTS parse_generation_code;
