-- ============================================================================
-- Allow authenticated callers to spend credits (self only)
-- Migration: 2026-05-23
-- Purpose:
-- - Enable edge functions (debug-analyze/generate) to call spend_credits via anon key + user JWT
-- - spend_credits itself enforces auth.uid() == p_user_id unless service_role
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.spend_credits(UUID, INTEGER, TEXT, TEXT, TEXT, JSONB) TO authenticated;

