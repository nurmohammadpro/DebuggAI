-- 20260527000100_fix_profiles_select_rls.sql
-- Drop the overly permissive public-read policy on profiles.
-- The self-only policy (profiles_select_own) already exists from the
-- 20260506_schema_normalization migration. Both policies currently coexist,
-- and since RLS policies are permissive (OR'd together), the public one
-- still allows any authenticated user to read all profiles including emails.
-- Admin users access all profiles via the service-role client (which bypasses
-- RLS), so dropping the public policy does not affect admin functionality.

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
