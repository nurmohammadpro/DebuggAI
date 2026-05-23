-- Expand allowed generations.stack values to match the app's stack selector.
-- The initial schema constrained stack to legacy values only, which breaks /api/projects
-- when the UI sends newer stacks like 'nextjs'.

DO $$
BEGIN
  ALTER TABLE public.generations DROP CONSTRAINT IF EXISTS generations_stack_check;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipping drop generations_stack_check: %', SQLERRM;
END $$;

ALTER TABLE public.generations
  ADD CONSTRAINT generations_stack_check
  CHECK (
    stack IS NULL
    OR stack IN (
      'nextjs',
      'react',
      'mern',
      'mean',
      'laravel',
      'django',
      'flask',
      'rails',
      'go'
    )
  );

