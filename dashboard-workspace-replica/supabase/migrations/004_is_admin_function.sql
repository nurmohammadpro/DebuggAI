-- Admin helper: SECURITY DEFINER admin check
-- Used by server-side admin routes. Never trust client claims.

DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid DEFAULT auth.uid())
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $fn$
  DECLARE
    v_is_admin boolean;
  BEGIN
    SELECT COALESCE(is_admin, false)
    INTO v_is_admin
    FROM public.profiles
    WHERE id = p_user_id;
    RETURN COALESCE(v_is_admin, false);
  END;
  $fn$;

  REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM PUBLIC;
  GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Skipping is_admin setup: %', SQLERRM;
END $$;

